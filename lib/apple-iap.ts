/**
 * App Store Server API helpers (StoreKit 2 JWS + Notifications V2).
 *
 * Env:
 * - APPLE_IAP_ISSUER_ID
 * - APPLE_IAP_KEY_ID
 * - APPLE_IAP_PRIVATE_KEY  (PEM contents of AuthKey_XXX.p8, newlines ok as \n)
 * - APPLE_IAP_BUNDLE_ID
 * - APPLE_IAP_ENVIRONMENT  optional: "Sandbox" | "Production" (default try both)
 */

import {
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  X509Certificate,
} from "crypto";
import type { SubscriptionStatus } from "@/lib/subscriptions";

export type AppleVerifiedSubscription = {
  productId: string;
  originalTransactionId: string;
  transactionId: string;
  expiresAt: Date | null;
  status: SubscriptionStatus;
  environment: string;
  raw: unknown;
};

function requiredEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

function applePrivateKeyPem(): string {
  const raw = requiredEnv("APPLE_IAP_PRIVATE_KEY");
  return raw.includes("BEGIN") ? raw : raw.replace(/\\n/g, "\n");
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** ES256 client JWT for App Store Server API. */
export function createAppleApiToken(): string {
  const issuer = requiredEnv("APPLE_IAP_ISSUER_ID");
  const keyId = requiredEnv("APPLE_IAP_KEY_ID");
  const bundleId = requiredEnv("APPLE_IAP_BUNDLE_ID");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const payload = {
    iss: issuer,
    iat: now,
    exp: now + 50 * 60,
    aud: "appstoreconnect-v1",
    bid: bundleId,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;
  const key = createPrivateKey(applePrivateKeyPem());
  const sign = createSign("SHA256");
  sign.update(unsigned);
  sign.end();
  // Apple expects IEEE P1363 (r||s), not DER.
  const der = sign.sign(key);
  const p1363 = derToJose(der, 64);
  return `${unsigned}.${base64url(p1363)}`;
}

function derToJose(der: Buffer, size: number): Buffer {
  // Minimal ECDSA DER → raw r||s
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;
  if (der[offset] !== 0x02) throw new Error("apple_jwt_bad_der");
  const rLen = der[offset + 1];
  let r = der.subarray(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (der[offset] !== 0x02) throw new Error("apple_jwt_bad_der");
  const sLen = der[offset + 1];
  let s = der.subarray(offset + 2, offset + 2 + sLen);
  if (r[0] === 0x00) r = r.subarray(1);
  if (s[0] === 0x00) s = s.subarray(1);
  const out = Buffer.alloc(size);
  r.copy(out, size / 2 - r.length);
  s.copy(out, size - s.length);
  return out;
}

function decodeJwsPayload<T = Record<string, unknown>>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length < 2) throw new Error("invalid_jws");
  const json = Buffer.from(
    parts[1]!.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
  return JSON.parse(json) as T;
}

/**
 * Verify JWS using x5c leaf cert from the header (App Store signed payloads).
 * Sufficient for transaction / notification payloads from Apple.
 */
export function verifyAppleJws<T = Record<string, unknown>>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("invalid_jws");
  const header = JSON.parse(
    Buffer.from(parts[0]!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8",
    ),
  ) as { x5c?: string[]; alg?: string };
  const x5c = header.x5c?.[0];
  if (!x5c) throw new Error("jws_missing_x5c");
  const certPem = `-----BEGIN CERTIFICATE-----\n${x5c.match(/.{1,64}/g)?.join("\n")}\n-----END CERTIFICATE-----\n`;
  const cert = new X509Certificate(certPem);
  const key = createPublicKey(cert.publicKey);
  const data = Buffer.from(`${parts[0]}.${parts[1]}`);
  const sig = Buffer.from(
    parts[2]!.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );
  // Convert JOSE to DER for verify
  const der = joseToDer(sig);
  const verify = createVerify("SHA256");
  verify.update(data);
  verify.end();
  if (!verify.verify(key, der)) throw new Error("jws_signature_invalid");
  return decodeJwsPayload<T>(jws);
}

function joseToDer(jose: Buffer): Buffer {
  const size = jose.length / 2;
  let r = jose.subarray(0, size);
  let s = jose.subarray(size);
  if (r[0]! & 0x80) r = Buffer.concat([Buffer.from([0]), r]);
  if (s[0]! & 0x80) s = Buffer.concat([Buffer.from([0]), s]);
  const len = 2 + r.length + 2 + s.length;
  return Buffer.concat([
    Buffer.from([0x30, len, 0x02, r.length]),
    r,
    Buffer.from([0x02, s.length]),
    s,
  ]);
}

type AppleTx = {
  productId?: string;
  originalTransactionId?: string;
  transactionId?: string;
  expiresDate?: number;
  revocationDate?: number;
  type?: string;
  environment?: string;
  bundleId?: string;
};

function mapAppleStatus(tx: AppleTx): SubscriptionStatus {
  if (tx.revocationDate) return "revoked";
  if (tx.expiresDate && tx.expiresDate < Date.now()) return "expired";
  return "active";
}

export function subscriptionFromAppleTransaction(
  tx: AppleTx,
  raw: unknown,
): AppleVerifiedSubscription {
  const productId = tx.productId;
  const originalTransactionId = tx.originalTransactionId;
  if (!productId || !originalTransactionId) {
    throw new Error("apple_tx_incomplete");
  }
  const bundleId = process.env.APPLE_IAP_BUNDLE_ID?.trim();
  if (bundleId && tx.bundleId && tx.bundleId !== bundleId) {
    throw new Error("apple_bundle_mismatch");
  }
  return {
    productId,
    originalTransactionId,
    transactionId: tx.transactionId ?? originalTransactionId,
    expiresAt: tx.expiresDate ? new Date(tx.expiresDate) : null,
    status: mapAppleStatus(tx),
    environment: tx.environment ?? "Unknown",
    raw,
  };
}

/** Client sends StoreKit 2 JWS (`serverVerificationData` / `verificationData`). */
export function verifyAppleSignedTransaction(
  signedTransaction: string,
): AppleVerifiedSubscription {
  const tx = verifyAppleJws<AppleTx>(signedTransaction);
  return subscriptionFromAppleTransaction(tx, tx);
}

async function fetchAppleTransaction(
  transactionId: string,
  environment: "Production" | "Sandbox",
): Promise<AppleVerifiedSubscription | null> {
  const host =
    environment === "Sandbox"
      ? "https://api.storekit-sandbox.itunes.apple.com"
      : "https://api.storekit.itunes.apple.com";
  const token = createAppleApiToken();
  const res = await fetch(
    `${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`apple_api_${res.status}:${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { signedTransactionInfo?: string };
  if (!json.signedTransactionInfo) throw new Error("apple_api_missing_tx");
  return verifyAppleSignedTransaction(json.signedTransactionInfo);
}

export async function lookupAppleTransaction(
  transactionId: string,
): Promise<AppleVerifiedSubscription> {
  const prefer = process.env.APPLE_IAP_ENVIRONMENT?.trim();
  const order: Array<"Production" | "Sandbox"> =
    prefer === "Sandbox"
      ? ["Sandbox", "Production"]
      : ["Production", "Sandbox"];
  let lastErr: unknown;
  for (const env of order) {
    try {
      const hit = await fetchAppleTransaction(transactionId, env);
      if (hit) return hit;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  throw new Error("apple_transaction_not_found");
}

export type AppleNotification = {
  notificationType?: string;
  subtype?: string;
  data?: {
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
    environment?: string;
  };
};

export function parseAppleNotification(
  signedPayload: string,
): {
  notification: AppleNotification;
  subscription: AppleVerifiedSubscription | null;
} {
  const notification = verifyAppleJws<AppleNotification>(signedPayload);
  const signedTx = notification.data?.signedTransactionInfo;
  if (!signedTx) {
    return { notification, subscription: null };
  }
  return {
    notification,
    subscription: verifyAppleSignedTransaction(signedTx),
  };
}

export function appleNotificationToStatus(
  notificationType: string | undefined,
  subscription: AppleVerifiedSubscription,
): SubscriptionStatus {
  switch (notificationType) {
    case "REFUND":
    case "REVOKE":
      return "revoked";
    case "EXPIRED":
    case "GRACE_PERIOD_EXPIRED":
      return "expired";
    case "DID_FAIL_TO_RENEW":
      return "billing_retry";
    case "DID_ENTER_BILLING_RETRY":
      return "billing_retry";
    case "GRACE_PERIOD":
      return "grace";
    default:
      return subscription.status;
  }
}

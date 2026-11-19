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
  sign as cryptoSign,
  verify as cryptoVerify,
  X509Certificate,
  type KeyObject,
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
  let raw = requiredEnv("APPLE_IAP_PRIVATE_KEY");
  // Vercel / .env often wrap the PEM in quotes.
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }
  // Always unescape \n — "BEGIN" can be present while newlines are still literal.
  const pem = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
  if (!pem.includes("BEGIN PRIVATE KEY") && !pem.includes("BEGIN EC PRIVATE")) {
    throw new Error(
      "apple_private_key_invalid: expected PKCS#8 PEM (-----BEGIN PRIVATE KEY-----)",
    );
  }
  return pem;
}

function loadApplePrivateKey(): KeyObject {
  const key = createPrivateKey({ key: applePrivateKeyPem(), format: "pem" });
  if (key.type !== "private") {
    throw new Error(
      `apple_private_key_invalid: key.type=${key.type} (expected private)`,
    );
  }
  return key;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlToBuffer(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
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
  const key = loadApplePrivateKey();
  // Apple expects IEEE P1363 (r||s), not DER.
  const sig = cryptoSign("sha256", Buffer.from(unsigned), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${unsigned}.${base64url(sig)}`;
}

function decodeJwsPayload<T = Record<string, unknown>>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length < 2) throw new Error("invalid_jws");
  return JSON.parse(base64urlToBuffer(parts[1]!).toString("utf8")) as T;
}

/**
 * Verify JWS using x5c leaf cert from the header (App Store signed payloads).
 * Sufficient for transaction / notification payloads from Apple.
 */
export function verifyAppleJws<T = Record<string, unknown>>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("invalid_jws");
  const header = JSON.parse(
    base64urlToBuffer(parts[0]!).toString("utf8"),
  ) as { x5c?: string[]; alg?: string };
  const x5c = header.x5c?.[0];
  if (!x5c) throw new Error("jws_missing_x5c");
  const certPem = `-----BEGIN CERTIFICATE-----\n${x5c.match(/.{1,64}/g)?.join("\n")}\n-----END CERTIFICATE-----\n`;
  const cert = new X509Certificate(certPem);
  const data = Buffer.from(`${parts[0]}.${parts[1]}`);
  const sig = base64urlToBuffer(parts[2]!);
  // StoreKit JWS uses ES256 with IEEE P1363 signatures.
  const ok = cryptoVerify(
    "sha256",
    data,
    { key: cert.publicKey, dsaEncoding: "ieee-p1363" },
    sig,
  );
  if (!ok) throw new Error("jws_signature_invalid");
  return decodeJwsPayload<T>(jws);
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
  const trimmed = signedTransaction.trim();
  // Some clients wrap the JWS in JSON; unwrap if needed.
  let jws = trimmed;
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        signedTransactionInfo?: string;
        jws?: string;
      };
      jws =
        parsed.signedTransactionInfo?.trim() ||
        parsed.jws?.trim() ||
        trimmed;
    } catch {
      // keep raw
    }
  }
  const tx = verifyAppleJws<AppleTx>(jws);
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

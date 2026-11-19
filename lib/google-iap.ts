/**
 * Google Play subscription verification (Android Publisher API).
 *
 * Env:
 * - GOOGLE_PLAY_PACKAGE_NAME
 * - GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  (full service account JSON string)
 */

import { createPrivateKey, createSign } from "crypto";
import type { SubscriptionStatus } from "@/lib/subscriptions";

export type GoogleVerifiedSubscription = {
  productId: string;
  purchaseToken: string;
  expiresAt: Date | null;
  status: SubscriptionStatus;
  environment: string;
  orderId: string | null;
  raw: unknown;
};

function requiredEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

function loadServiceAccount(): {
  client_email: string;
  private_key: string;
} {
  const raw = requiredEnv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  const json = JSON.parse(raw) as {
    client_email?: string;
    private_key?: string;
  };
  if (!json.client_email || !json.private_key) {
    throw new Error("google_sa_incomplete");
  }
  return {
    client_email: json.client_email,
    private_key: json.private_key.replace(/\\n/g, "\n"),
  };
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function googleAccessToken(): Promise<string> {
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;
  const key = createPrivateKey(sa.private_key);
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const jwt = `${unsigned}.${base64url(sign.sign(key))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`google_token_${res.status}:${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("google_token_missing");
  return json.access_token;
}

type PlaySubResponse = {
  expiryTimeMillis?: string;
  paymentState?: number;
  cancelReason?: number;
  acknowledgementState?: number;
  orderId?: string;
  autoRenewing?: boolean;
  purchaseType?: number; // 0 test, 1 promo
};

function mapGoogleStatus(data: PlaySubResponse): SubscriptionStatus {
  const expiry = data.expiryTimeMillis
    ? Number(data.expiryTimeMillis)
    : NaN;
  if (data.cancelReason === 1) return "revoked"; // system
  if (!Number.isNaN(expiry) && expiry < Date.now()) return "expired";
  // paymentState: 0 pending, 1 received, 2 free trial, 3 deferred
  if (data.paymentState === 0) return "billing_retry";
  return "active";
}

export async function verifyGoogleSubscription(opts: {
  productId: string;
  purchaseToken: string;
}): Promise<GoogleVerifiedSubscription> {
  const packageName = requiredEnv("GOOGLE_PLAY_PACKAGE_NAME");
  const token = await googleAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptions/` +
    `${encodeURIComponent(opts.productId)}/tokens/` +
    `${encodeURIComponent(opts.purchaseToken)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`google_iap_${res.status}:${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as PlaySubResponse;
  const expiresAt = data.expiryTimeMillis
    ? new Date(Number(data.expiryTimeMillis))
    : null;

  // Acknowledge if needed (subscriptions should be acknowledged).
  if (data.acknowledgementState === 0) {
    await fetch(`${url}:acknowledge`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    }).catch(() => {
      /* non-fatal */
    });
  }

  return {
    productId: opts.productId,
    purchaseToken: opts.purchaseToken,
    expiresAt,
    status: mapGoogleStatus(data),
    environment: data.purchaseType === 0 ? "Sandbox" : "Production",
    orderId: data.orderId ?? null,
    raw: data,
  };
}

/** Play Real-time developer notification (Pub/Sub push body). */
export type GoogleRtdnMessage = {
  message?: { data?: string; messageId?: string };
  subscription?: string;
};

export type GoogleDeveloperNotification = {
  version?: string;
  packageName?: string;
  eventTimeMillis?: string;
  subscriptionNotification?: {
    version?: string;
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
};

export function parseGoogleRtdn(
  body: GoogleRtdnMessage,
): GoogleDeveloperNotification | null {
  const data = body.message?.data;
  if (!data) return null;
  const json = Buffer.from(data, "base64").toString("utf8");
  return JSON.parse(json) as GoogleDeveloperNotification;
}

export function googleNotificationTypeToStatus(
  notificationType: number | undefined,
  fallback: SubscriptionStatus,
): SubscriptionStatus {
  // https://developer.android.com/google/play/billing/rtdn-reference
  switch (notificationType) {
    case 3: // CANCELED — still entitled until expiry
      return fallback;
    case 12: // REVOKED
      return "revoked";
    case 13: // EXPIRED
      return "expired";
    case 5: // ON_HOLD
    case 6: // IN_GRACE_PERIOD
      return notificationType === 6 ? "grace" : "billing_retry";
    default:
      return fallback;
  }
}

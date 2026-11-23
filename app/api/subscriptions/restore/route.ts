import { NextRequest, NextResponse } from "next/server";

import {
  lookupAppleTransaction,
  verifyAppleSignedTransaction,
} from "@/lib/apple-iap";
import { verifyGoogleSubscription } from "@/lib/google-iap";
import { optionalFirebaseUser } from "@/lib/request-auth";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  syncPlanTierForOwner,
  upsertSubscription,
} from "@/lib/subscriptions";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

type RestoreItem = {
  platform: "ios" | "android";
  productId: string;
  verificationData?: string;
  transactionId?: string;
  purchaseToken?: string;
};

/**
 * POST /api/subscriptions/restore
 * Body: { deviceKey, purchases?: RestoreItem[] }
 * Requires Authorization: Bearer <Firebase ID token>.
 */
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "subscriptions_unavailable" }, 503);
  }

  try {
    const user = await optionalFirebaseUser(request);
    if (!user?.uid) {
      return json({ error: "auth_required" }, 401);
    }
    const body = (await request.json()) as {
      deviceKey?: string;
      purchases?: RestoreItem[];
    };
    const deviceKey = body.deviceKey?.trim();
    if (!deviceKey) {
      return json({ error: "deviceKey_required" }, 400);
    }

    const owner = {
      firebaseUid: user.uid,
      deviceKey,
    };
    const purchases = Array.isArray(body.purchases) ? body.purchases : [];
    if (purchases.length === 0) {
      const synced = await syncPlanTierForOwner(owner);
      return json({ planTier: synced.planTier, restored: 0 });
    }

    let restored = 0;
    for (const item of purchases.slice(0, 20)) {
      try {
        if (item.platform === "ios") {
          let verified = item.verificationData
            ? verifyAppleSignedTransaction(item.verificationData)
            : null;
          if (!verified && item.transactionId) {
            verified = await lookupAppleTransaction(item.transactionId.trim());
          }
          if (!verified) continue;
          await upsertSubscription({
            ...owner,
            platform: "ios",
            productId: verified.productId,
            storeIdentity: verified.originalTransactionId,
            originalTransactionId: verified.originalTransactionId,
            status: verified.status,
            expiresAt: verified.expiresAt,
            environment: verified.environment,
            raw: verified.raw,
          });
          restored += 1;
        } else if (item.platform === "android") {
          const token = item.purchaseToken?.trim();
          const productId = item.productId?.trim();
          if (!token || !productId) continue;
          const verified = await verifyGoogleSubscription({
            productId,
            purchaseToken: token,
          });
          await upsertSubscription({
            ...owner,
            platform: "android",
            productId: verified.productId,
            storeIdentity: verified.purchaseToken,
            purchaseToken: verified.purchaseToken,
            originalTransactionId: verified.orderId,
            status: verified.status,
            expiresAt: verified.expiresAt,
            environment: verified.environment,
            raw: verified.raw,
          });
          restored += 1;
        }
      } catch (e) {
        console.warn("[subscriptions restore item]", e);
      }
    }

    const synced = await syncPlanTierForOwner(owner);
    return json({
      planTier: synced.planTier,
      restored,
      balance: synced.account?.balance ?? null,
    });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    if (status === 401) return json({ error: "unauthorized" }, 401);
    console.error("[subscriptions restore]", e);
    return json({ error: "restore_failed" }, 500);
  }
}

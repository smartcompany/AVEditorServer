import { NextRequest, NextResponse } from "next/server";

import {
  verifyAppleSignedTransaction,
  lookupAppleTransaction,
} from "@/lib/apple-iap";
import { verifyGoogleSubscription } from "@/lib/google-iap";
import { requireFirebaseUser } from "@/lib/request-auth";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  syncPlanTierForUid,
  upsertSubscription,
  type StorePlatform,
} from "@/lib/subscriptions";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * POST /api/subscriptions/verify
 * Authorization: Bearer <Firebase ID token>
 * Body:
 *  {
 *    platform: "ios" | "android",
 *    productId: string,
 *    // iOS: StoreKit 2 JWS (preferred) and/or transactionId
 *    verificationData?: string,
 *    transactionId?: string,
 *    // Android
 *    purchaseToken?: string,
 *  }
 */
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "subscriptions_unavailable" }, 503);
  }

  try {
    const user = await requireFirebaseUser(request);
    const body = (await request.json()) as {
      platform?: string;
      productId?: string;
      verificationData?: string;
      transactionId?: string;
      purchaseToken?: string;
    };

    const platform = body.platform as StorePlatform | undefined;
    const productId = body.productId?.trim();
    if (platform !== "ios" && platform !== "android") {
      return json({ error: "platform_required" }, 400);
    }
    if (!productId) return json({ error: "productId_required" }, 400);

    if (platform === "ios") {
      let verified = body.verificationData
        ? verifyAppleSignedTransaction(body.verificationData)
        : null;
      if (!verified && body.transactionId) {
        verified = await lookupAppleTransaction(body.transactionId.trim());
      }
      if (!verified) {
        return json({ error: "ios_verification_required" }, 400);
      }
      if (verified.productId !== productId) {
        return json({ error: "product_mismatch" }, 400);
      }

      await upsertSubscription({
        firebaseUid: user.uid,
        platform: "ios",
        productId: verified.productId,
        storeIdentity: verified.originalTransactionId,
        originalTransactionId: verified.originalTransactionId,
        status: verified.status,
        expiresAt: verified.expiresAt,
        environment: verified.environment,
        raw: verified.raw,
      });
    } else {
      const purchaseToken = body.purchaseToken?.trim();
      if (!purchaseToken) {
        return json({ error: "purchaseToken_required" }, 400);
      }
      const verified = await verifyGoogleSubscription({
        productId,
        purchaseToken,
      });
      await upsertSubscription({
        firebaseUid: user.uid,
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
    }

    const synced = await syncPlanTierForUid(user.uid);
    return json({
      planTier: synced.planTier,
      expiresAt: synced.account
        ? undefined
        : null,
      balance: synced.account?.balance ?? null,
    });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : String(e);
    if (status === 401) return json({ error: "unauthorized" }, 401);
    if (msg.startsWith("missing_env:")) {
      return json({ error: "store_config", message: msg }, 500);
    }
    if (msg.startsWith("unknown_product:")) {
      return json({ error: "unknown_product" }, 400);
    }
    console.error("[subscriptions verify]", e);
    return json({ error: "verify_failed", message: msg }, status >= 400 ? status : 500);
  }
}

import { NextRequest, NextResponse } from "next/server";

import {
  verifyAppleSignedTransaction,
  lookupAppleTransaction,
  resolveAppleSubscription,
} from "@/lib/apple-iap";
import { verifyGoogleSubscription } from "@/lib/google-iap";
import { optionalFirebaseUser } from "@/lib/request-auth";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  syncPlanTierForOwner,
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
 * Body:
 *  {
 *    deviceKey: string,
 *    platform: "ios" | "android",
 *    productId: string,
 *    verificationData?: string,         // iOS JWS
 *    transactionId?: string,
 *    purchaseToken?: string,            // Android
 *  }
 * Requires Authorization: Bearer <Firebase ID token> — entitlement is account-based.
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
      platform?: string;
      productId?: string;
      verificationData?: string;
      transactionId?: string;
      purchaseToken?: string;
    };

    const deviceKey = body.deviceKey?.trim();
    if (!deviceKey) return json({ error: "deviceKey_required" }, 400);

    const platform = body.platform as StorePlatform | undefined;
    const productId = body.productId?.trim();
    if (platform !== "ios" && platform !== "android") {
      return json({ error: "platform_required" }, 400);
    }
    if (!productId) return json({ error: "productId_required" }, 400);

    const owner = {
      firebaseUid: user.uid,
      deviceKey,
    };

    if (platform === "ios") {
      let verified = null as ReturnType<typeof verifyAppleSignedTransaction> | null;
      let jwsError: string | null = null;
      let lookupError: string | null = null;
      if (body.verificationData?.trim()) {
        try {
          verified = verifyAppleSignedTransaction(body.verificationData.trim());
        } catch (e) {
          jwsError = e instanceof Error ? e.message : String(e);
          console.warn("[subscriptions verify] apple JWS failed:", jwsError);
        }
      }
      if (!verified && body.transactionId?.trim()) {
        try {
          verified = await lookupAppleTransaction(body.transactionId.trim());
        } catch (e) {
          lookupError = e instanceof Error ? e.message : String(e);
          console.warn("[subscriptions verify] apple lookup failed:", lookupError);
        }
      }
      if (!verified) {
        return json(
          {
            error: "ios_verification_required",
            jwsError,
            lookupError,
          },
          400,
        );
      }
      // Sandbox (and renewals) often redeliver an expired period JWS — ask Apple
      // for the current subscription status before writing free/expired.
      verified = await resolveAppleSubscription(verified);
      if (verified.productId !== productId) {
        return json({ error: "product_mismatch" }, 400);
      }

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
    }

    const synced = await syncPlanTierForOwner(owner);
    return json({
      planTier: synced.planTier,
      productId,
      firebaseUid: user.uid,
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

import { NextRequest, NextResponse } from "next/server";

import {
  appleNotificationToStatus,
  parseAppleNotification,
} from "@/lib/apple-iap";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  findSubscriptionByOriginalTransactionId,
  syncPlanTierForUid,
  upsertSubscription,
} from "@/lib/subscriptions";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * POST /api/subscriptions/apple-notifications
 * App Store Server Notifications V2 — body { signedPayload }.
 */
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "unavailable" }, 503);
  }

  try {
    const body = (await request.json()) as { signedPayload?: string };
    if (!body.signedPayload) return json({ error: "signedPayload_required" }, 400);

    const { notification, subscription } = parseAppleNotification(
      body.signedPayload,
    );
    if (!subscription) {
      return json({ ok: true, ignored: true });
    }

    const status = appleNotificationToStatus(
      notification.notificationType,
      subscription,
    );

    const existing = await findSubscriptionByOriginalTransactionId(
      subscription.originalTransactionId,
    );
    const firebaseUid = existing?.firebase_uid;
    if (!firebaseUid) {
      // Unknown buyer — store orphan row under placeholder uid for later claim.
      console.warn(
        "[apple-notifications] no uid for",
        subscription.originalTransactionId,
      );
      return json({ ok: true, unmatched: true });
    }

    await upsertSubscription({
      firebaseUid,
      platform: "ios",
      productId: subscription.productId,
      storeIdentity: subscription.originalTransactionId,
      originalTransactionId: subscription.originalTransactionId,
      status,
      expiresAt: subscription.expiresAt,
      environment: subscription.environment,
      raw: { notificationType: notification.notificationType, ...subscription.raw as object },
    });
    await syncPlanTierForUid(firebaseUid);
    return json({ ok: true });
  } catch (e) {
    console.error("[apple-notifications]", e);
    return json({ error: "notification_failed" }, 500);
  }
}

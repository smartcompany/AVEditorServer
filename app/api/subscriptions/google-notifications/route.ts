import { NextRequest, NextResponse } from "next/server";

import {
  googleNotificationTypeToStatus,
  parseGoogleRtdn,
  verifyGoogleSubscription,
} from "@/lib/google-iap";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  findSubscriptionByStoreIdentity,
  syncPlanTierForOwner,
  upsertSubscription,
} from "@/lib/subscriptions";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * POST /api/subscriptions/google-notifications
 * Play Real-time developer notifications (Pub/Sub push).
 */
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "unavailable" }, 503);
  }

  try {
    const body = (await request.json()) as Parameters<typeof parseGoogleRtdn>[0];
    const note = parseGoogleRtdn(body);
    const subNote = note?.subscriptionNotification;
    if (!subNote?.purchaseToken || !subNote.subscriptionId) {
      return json({ ok: true, ignored: true });
    }

    const existing = await findSubscriptionByStoreIdentity(
      "android",
      subNote.purchaseToken,
    );

    const verified = await verifyGoogleSubscription({
      productId: subNote.subscriptionId,
      purchaseToken: subNote.purchaseToken,
    });
    const status = googleNotificationTypeToStatus(
      subNote.notificationType,
      verified.status,
    );

    const firebaseUid = existing?.firebase_uid ?? null;
    const deviceKey = existing?.device_key ?? null;
    if (!firebaseUid && !deviceKey) {
      console.warn(
        "[google-notifications] no owner for token",
        subNote.purchaseToken.slice(0, 12),
      );
      return json({ ok: true, unmatched: true });
    }

    await upsertSubscription({
      firebaseUid,
      deviceKey,
      platform: "android",
      productId: verified.productId,
      storeIdentity: verified.purchaseToken,
      purchaseToken: verified.purchaseToken,
      originalTransactionId: verified.orderId,
      status,
      expiresAt: verified.expiresAt,
      environment: verified.environment,
      raw: {
        notificationType: subNote.notificationType,
        ...(verified.raw as object),
      },
    });
    await syncPlanTierForOwner({ firebaseUid, deviceKey });
    return json({ ok: true });
  } catch (e) {
    console.error("[google-notifications]", e);
    return json({ error: "notification_failed" }, 500);
  }
}

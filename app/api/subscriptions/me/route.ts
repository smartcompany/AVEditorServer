import { NextRequest, NextResponse } from "next/server";

import {
  findAccountByDevice,
  findAccountByUid,
} from "@/lib/credit-accounts";
import { optionalFirebaseUser } from "@/lib/request-auth";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  bestActiveTier,
  isSubscriptionActive,
  listSubscriptionsForOwner,
  syncPlanTierForOwner,
} from "@/lib/subscriptions";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** GET /api/subscriptions/me?deviceKey= — entitlement for account (uid) and/or install. */
export async function GET(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "subscriptions_unavailable" }, 503);
  }

  try {
    const user = await optionalFirebaseUser(request);
    const deviceKey = request.nextUrl.searchParams.get("deviceKey")?.trim() || null;
    if (!user && !deviceKey) {
      return json({ error: "deviceKey_required" }, 400);
    }

    const owner = {
      firebaseUid: user?.uid ?? null,
      deviceKey,
    };
    const synced = await syncPlanTierForOwner(owner);
    const rows = await listSubscriptionsForOwner(owner);
    const active = rows.filter((r) =>
      isSubscriptionActive(r.status, r.expires_at),
    );
    const planTier = synced.planTier || bestActiveTier(rows);
    const primary =
      active.find((r) => r.tier === planTier) ?? active[0] ?? null;
    const account =
      synced.account ??
      (user ? await findAccountByUid(user.uid) : null) ??
      (deviceKey ? await findAccountByDevice(deviceKey) : null);

    return json({
      planTier,
      productId: primary?.product_id ?? null,
      firebaseUid: user?.uid ?? account?.firebase_uid ?? null,
      balance: account?.balance ?? null,
      subscriptions: active.map((r) => ({
        platform: r.platform,
        productId: r.product_id,
        tier: r.tier,
        status: r.status,
        expiresAt: r.expires_at,
        environment: r.environment,
      })),
    });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    if (status === 401) return json({ error: "unauthorized" }, 401);
    console.error("[subscriptions me]", e);
    return json({ error: "subscriptions_failed" }, 500);
  }
}

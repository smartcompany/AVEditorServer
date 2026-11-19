import { NextRequest, NextResponse } from "next/server";

import { findAccountByUid } from "@/lib/credit-accounts";
import { requireFirebaseUser } from "@/lib/request-auth";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  bestActiveTier,
  isSubscriptionActive,
  listSubscriptionsForUid,
  syncPlanTierForUid,
} from "@/lib/subscriptions";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** GET /api/subscriptions/me — current entitlement for the signed-in user. */
export async function GET(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "subscriptions_unavailable" }, 503);
  }

  try {
    const user = await requireFirebaseUser(request);
    const synced = await syncPlanTierForUid(user.uid);
    const rows = await listSubscriptionsForUid(user.uid);
    const active = rows.filter((r) =>
      isSubscriptionActive(r.status, r.expires_at),
    );
    const account = synced.account ?? (await findAccountByUid(user.uid));

    return json({
      planTier: synced.planTier || bestActiveTier(rows),
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

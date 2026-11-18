import { NextRequest, NextResponse } from "next/server";

import { grantAdReward } from "@/lib/credit-accounts";
import { AD_REWARD_CREDITS } from "@/lib/credits";
import { hasSupabaseConfig } from "@/lib/supabase";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** POST /api/credits/ad-reward { deviceKey } */
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "credits_unavailable" }, 503);
  }
  try {
    const body = (await request.json()) as { deviceKey?: string };
    const deviceKey = body.deviceKey?.trim();
    if (!deviceKey) return json({ error: "deviceKey_required" }, 400);

    const account = await grantAdReward(deviceKey);
    return json({
      balance: account.balance,
      granted: AD_REWARD_CREDITS,
      planTier: account.plan_tier,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.message === "ad_reward_too_soon") {
      return json({ error: "ad_reward_too_soon" }, 429);
    }
    console.error("[credits ad-reward]", e);
    return json({ error: "credits_failed" }, 500);
  }
}

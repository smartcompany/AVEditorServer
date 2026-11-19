import { NextRequest, NextResponse } from "next/server";

import { bootstrapAccount } from "@/lib/credit-accounts";
import { costMap } from "@/lib/credits";
import { getPlansConfig } from "@/lib/plans-config-store";
import { hasSupabaseConfig } from "@/lib/supabase";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** POST /api/credits/bootstrap { deviceKey } */
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "credits_unavailable" }, 503);
  }
  try {
    const body = (await request.json()) as { deviceKey?: string };
    const deviceKey = body.deviceKey?.trim();
    if (!deviceKey) return json({ error: "deviceKey_required" }, 400);

    const [account, plansConfig] = await Promise.all([
      bootstrapAccount(deviceKey),
      getPlansConfig(),
    ]);
    return json({
      balance: account.balance,
      planTier: account.plan_tier,
      economy: costMap(plansConfig),
      plans: plansConfig.plans,
      plansVersion: plansConfig.version,
    });
  } catch (e) {
    console.error("[credits bootstrap]", e);
    return json({ error: "credits_failed" }, 500);
  }
}

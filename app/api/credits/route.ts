import { NextRequest, NextResponse } from "next/server";

import { bootstrapAccount } from "@/lib/credit-accounts";
import { PLANS, costMap } from "@/lib/credits";
import { hasSupabaseConfig } from "@/lib/supabase";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** GET /api/credits?deviceKey=… — balance + economy catalog. */
export async function GET(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "credits_unavailable" }, 503);
  }
  const deviceKey = request.nextUrl.searchParams.get("deviceKey")?.trim();
  if (!deviceKey) return json({ error: "deviceKey_required" }, 400);

  try {
    const account = await bootstrapAccount(deviceKey);
    return json({
      balance: account.balance,
      planTier: account.plan_tier,
      economy: costMap(),
      plans: PLANS,
    });
  } catch (e) {
    console.error("[credits GET]", e);
    return json({ error: "credits_failed" }, 500);
  }
}

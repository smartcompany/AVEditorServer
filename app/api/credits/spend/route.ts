import { NextRequest, NextResponse } from "next/server";

import { spendCredits } from "@/lib/credit-accounts";
import type { CreditItemKind } from "@/lib/credits";
import { hasSupabaseConfig } from "@/lib/supabase";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** POST /api/credits/spend { deviceKey, items:[{kind,id}] } */
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "credits_unavailable" }, 503);
  }
  try {
    const body = (await request.json()) as {
      deviceKey?: string;
      items?: Array<{ kind?: string; id?: string }>;
    };
    const deviceKey = body.deviceKey?.trim();
    if (!deviceKey) return json({ error: "deviceKey_required" }, 400);

    const items = (body.items ?? [])
      .filter(
        (i): i is { kind: CreditItemKind; id: string } =>
          (i.kind === "transition" || i.kind === "text") &&
          typeof i.id === "string" &&
          i.id.length > 0,
      )
      .map((i) => ({ kind: i.kind, id: i.id }));

    const result = await spendCredits(deviceKey, items);
    return json({
      balance: result.account.balance,
      cost: result.cost,
      skipped: result.skipped,
      planTier: result.account.plan_tier,
    });
  } catch (e) {
    const err = e as Error & {
      status?: number;
      need?: number;
      balance?: number;
    };
    if (err.message === "insufficient_credits") {
      return json(
        {
          error: "insufficient_credits",
          need: err.need ?? 0,
          balance: err.balance ?? 0,
        },
        402,
      );
    }
    if (err.message === "concurrent_update") {
      return json({ error: "concurrent_update" }, 409);
    }
    console.error("[credits spend]", e);
    return json({ error: "credits_failed" }, 500);
  }
}

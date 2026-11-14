import { FUNNEL_STEPS } from "@/lib/analytics";
import { authorizeDashboard } from "@/lib/dashboard-auth";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TotalRow = { event: string; events: number; installs: number };
type DailyRow = { day: string; event: string; events: number; installs: number };
type TopRow = { item_id: string; premium: boolean; events: number; installs: number };

/**
 * GET /api/analytics?days=30&platform=ios — dashboard aggregates.
 * Requires DASHBOARD_SECRET (x-dashboard-secret header).
 */
export async function GET(request: Request) {
  if (!(await authorizeDashboard(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseConfig()) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const platformParam = url.searchParams.get("platform");
  const platform = platformParam === "ios" || platformParam === "android" ? platformParam : null;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const db = getSupabaseAdmin();
  const [totals, daily, topTransitions, topText] = await Promise.all([
    db.rpc("aveditor_event_totals", { p_since: since, p_platform: platform }),
    db.rpc("aveditor_event_daily", { p_since: since, p_platform: platform }),
    db.rpc("aveditor_top_items", { p_since: since, p_event: "transition_applied", p_limit: 15 }),
    db.rpc("aveditor_top_items", { p_since: since, p_event: "text_style_applied", p_limit: 15 }),
  ]);

  const failed = [totals, daily, topTransitions, topText].find((r) => r.error);
  if (failed?.error) {
    const missing = /function|relation|does not exist|schema cache/i.test(failed.error.message);
    return Response.json(
      {
        error: missing ? "schema_missing" : "query_failed",
        message: failed.error.message,
      },
      { status: missing ? 409 : 500 },
    );
  }

  return Response.json(
    {
      days,
      platform,
      since,
      funnel: FUNNEL_STEPS,
      totals: (totals.data ?? []) as TotalRow[],
      daily: (daily.data ?? []) as DailyRow[],
      topTransitions: (topTransitions.data ?? []) as TopRow[],
      topText: (topText.data ?? []) as TopRow[],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

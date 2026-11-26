import { processDueCampaigns } from "@/lib/push-campaigns";
import { hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Fall back to dashboard secret so local/dev can hit the endpoint.
    const dash = process.env.DASHBOARD_SECRET?.trim();
    if (!dash) return process.env.NODE_ENV !== "production";
    const header =
      request.headers.get("x-cron-secret") ??
      request.headers.get("x-dashboard-secret") ??
      "";
    const auth = request.headers.get("authorization") ?? "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    return header === dash || bearer === dash;
  }
  const header = request.headers.get("x-cron-secret") ?? "";
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured.
  return header === secret || bearer === secret;
}

/** Process due scheduled catalog pushes. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseConfig()) {
    return Response.json({ error: "supabase_unconfigured" }, { status: 503 });
  }
  try {
    const result = await processDueCampaigns();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: "cron_failed", message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}

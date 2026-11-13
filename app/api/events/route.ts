import { EVENTS_TABLE, isAllowedEvent } from "@/lib/analytics";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EVENTS_PER_REQUEST = 50;
const MAX_PROPS_BYTES = 2000;

type IncomingEvent = { event?: unknown; props?: unknown; ts?: unknown };

/**
 * POST /api/events — anonymous usage events from the app.
 * Body: { install_id, platform, app_version, events: [{ event, props?, ts? }] }
 */
export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const installId = String(body.install_id ?? "").slice(0, 64);
  if (!/^[A-Za-z0-9-]{8,64}$/.test(installId)) {
    return Response.json({ error: "invalid_install_id" }, { status: 400 });
  }
  const platform = String(body.platform ?? "").slice(0, 16) || null;
  const appVersion = String(body.app_version ?? "").slice(0, 32) || null;
  const events = Array.isArray(body.events)
    ? (body.events as IncomingEvent[]).slice(0, MAX_EVENTS_PER_REQUEST)
    : [];

  const now = Date.now();
  const rows = [];
  for (const raw of events) {
    if (!isAllowedEvent(raw?.event)) continue;
    let props: Record<string, unknown> = {};
    if (raw.props && typeof raw.props === "object" && !Array.isArray(raw.props)) {
      const json = JSON.stringify(raw.props);
      if (json.length <= MAX_PROPS_BYTES) props = raw.props as Record<string, unknown>;
    }
    // Client time if sane (queued offline up to a week), else server time.
    const ts = typeof raw.ts === "number" ? raw.ts : NaN;
    const createdAt =
      Number.isFinite(ts) && ts <= now + 60_000 && ts >= now - 7 * 86_400_000
        ? new Date(ts).toISOString()
        : new Date(now).toISOString();
    rows.push({
      install_id: installId,
      platform,
      app_version: appVersion,
      event: raw.event,
      props,
      created_at: createdAt,
    });
  }
  if (rows.length === 0) return Response.json({ accepted: 0 });

  const { error } = await getSupabaseAdmin().from(EVENTS_TABLE).insert(rows);
  if (error) {
    console.error("[events] insert failed:", error.message);
    return Response.json({ error: "insert_failed" }, { status: 500 });
  }
  return Response.json({ accepted: rows.length });
}

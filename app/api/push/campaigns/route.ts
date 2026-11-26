import { authorizeDashboard } from "@/lib/dashboard-auth";
import {
  dispatchCampaign,
  normalizeCampaign,
  PUSH_LOCALES,
  type LocaleMap,
  type PushLocale,
} from "@/lib/push-campaigns";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { catalogCorsHeaders } from "@/lib/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: catalogCorsHeaders(),
  });
}

function emptyLocale(): LocaleMap {
  return { en: "", ko: "", ja: "", zh: "" };
}

function parseLocaleMap(raw: unknown): LocaleMap {
  const out = emptyLocale();
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Record<string, unknown>;
  for (const loc of PUSH_LOCALES) {
    const v = src[loc];
    if (typeof v === "string") out[loc] = v;
  }
  return out;
}

/** List recent campaigns. */
export async function GET(request: Request) {
  if (!(await authorizeDashboard(request))) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: catalogCorsHeaders() },
    );
  }
  if (!hasSupabaseConfig()) {
    return Response.json(
      { error: "supabase_unconfigured" },
      { status: 503, headers: catalogCorsHeaders() },
    );
  }

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("aveditor_push_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const campaigns = (data ?? []).map((row) =>
      normalizeCampaign(row as Record<string, unknown>),
    );
    return Response.json(
      { campaigns },
      { headers: { ...catalogCorsHeaders(), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "list_failed", message },
      { status: 500, headers: catalogCorsHeaders() },
    );
  }
}

/**
 * Create and immediately send a catalog push campaign.
 * Body: { titles: LocaleMap, bodies: LocaleMap }
 */
export async function POST(request: Request) {
  if (!(await authorizeDashboard(request))) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: catalogCorsHeaders() },
    );
  }
  if (!hasSupabaseConfig()) {
    return Response.json(
      { error: "supabase_unconfigured" },
      { status: 503, headers: catalogCorsHeaders() },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json" },
      { status: 400, headers: catalogCorsHeaders() },
    );
  }
  if (!body || typeof body !== "object") {
    return Response.json(
      { error: "invalid_body" },
      { status: 400, headers: catalogCorsHeaders() },
    );
  }

  const raw = body as Record<string, unknown>;
  const titles = parseLocaleMap(raw.titles);
  const bodies = parseLocaleMap(raw.bodies);
  const hasCopy = PUSH_LOCALES.some(
    (l: PushLocale) => titles[l].trim() || bodies[l].trim(),
  );
  if (!hasCopy) {
    return Response.json(
      { error: "copy_required" },
      { status: 400, headers: catalogCorsHeaders() },
    );
  }

  const now = new Date().toISOString();

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("aveditor_push_campaigns")
      .insert({
        target: "catalog",
        titles,
        bodies,
        status: "pending",
        send_at: now,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;

    const campaign = normalizeCampaign(data as Record<string, unknown>);
    const result = await dispatchCampaign(campaign.id);
    const { data: refreshed } = await db
      .from("aveditor_push_campaigns")
      .select("*")
      .eq("id", campaign.id)
      .maybeSingle();
    return Response.json(
      {
        campaign: refreshed
          ? normalizeCampaign(refreshed as Record<string, unknown>)
          : campaign,
        result,
      },
      { headers: { ...catalogCorsHeaders(), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "create_failed", message },
      { status: 500, headers: catalogCorsHeaders() },
    );
  }
}

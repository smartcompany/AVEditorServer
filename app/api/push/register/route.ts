import { optionalFirebaseUser } from "@/lib/request-auth";
import { PUSH_LOCALES, type PushLocale } from "@/lib/push-campaigns";
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

/**
 * Upsert an FCM device token + notification prefs.
 * Body: { deviceKey, token, platform?, locale?, catalogEnabled?, masterEnabled? }
 */
export async function POST(request: Request) {
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
  const deviceKey =
    typeof raw.deviceKey === "string" ? raw.deviceKey.trim() : "";
  const token = typeof raw.token === "string" ? raw.token.trim() : "";
  if (!deviceKey || !token) {
    return Response.json(
      { error: "deviceKey_and_token_required" },
      { status: 400, headers: catalogCorsHeaders() },
    );
  }

  const platformRaw =
    typeof raw.platform === "string" ? raw.platform.trim().toLowerCase() : "";
  const platform =
    platformRaw === "ios" ||
    platformRaw === "android" ||
    platformRaw === "web"
      ? platformRaw
      : "unknown";

  const localeRaw =
    typeof raw.locale === "string" ? raw.locale.trim().toLowerCase() : "en";
  const locale: PushLocale = PUSH_LOCALES.includes(localeRaw as PushLocale)
    ? (localeRaw as PushLocale)
    : "en";

  const catalogEnabled =
    typeof raw.catalogEnabled === "boolean" ? raw.catalogEnabled : true;
  const masterEnabled =
    typeof raw.masterEnabled === "boolean" ? raw.masterEnabled : true;

  const user = await optionalFirebaseUser(request);

  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from("aveditor_push_tokens").upsert(
      {
        device_key: deviceKey,
        firebase_uid: user?.uid ?? null,
        token,
        platform,
        locale,
        catalog_enabled: catalogEnabled,
        master_enabled: masterEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw error;
    return Response.json(
      { ok: true },
      { headers: { ...catalogCorsHeaders(), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "register_failed", message },
      { status: 500, headers: catalogCorsHeaders() },
    );
  }
}

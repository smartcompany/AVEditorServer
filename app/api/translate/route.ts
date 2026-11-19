import { authorizeDashboard } from "@/lib/dashboard-auth";
import {
  translateTexts,
  type TranslateLocale,
} from "@/lib/translate";
import { catalogCorsHeaders } from "@/lib/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCALES: TranslateLocale[] = ["en", "ko", "ja", "zh"];

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: catalogCorsHeaders(),
  });
}

/**
 * POST { texts: string[], from?: 'ko', to?: ['en','ja','zh'] }
 * → { translations: { en: string[], ja: string[], … } }
 */
export async function POST(request: Request) {
  if (!(await authorizeDashboard(request))) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: catalogCorsHeaders() },
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
  const texts = Array.isArray(raw.texts)
    ? raw.texts.filter((t): t is string => typeof t === "string")
    : [];
  if (texts.length === 0) {
    return Response.json(
      { error: "texts_required" },
      { status: 400, headers: catalogCorsHeaders() },
    );
  }
  if (texts.length > 40) {
    return Response.json(
      { error: "too_many_texts" },
      { status: 400, headers: catalogCorsHeaders() },
    );
  }

  const from =
    typeof raw.from === "string" && LOCALES.includes(raw.from as TranslateLocale)
      ? (raw.from as TranslateLocale)
      : "ko";
  const toRaw = Array.isArray(raw.to) ? raw.to : ["en", "ja", "zh"];
  const to = toRaw.filter(
    (l): l is TranslateLocale =>
      typeof l === "string" &&
      LOCALES.includes(l as TranslateLocale) &&
      l !== from,
  );
  if (to.length === 0) {
    return Response.json(
      { error: "to_required" },
      { status: 400, headers: catalogCorsHeaders() },
    );
  }

  try {
    const translations = await translateTexts({ texts, from, to });
    return Response.json(
      { from, to, translations },
      { headers: { ...catalogCorsHeaders(), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "translate_failed", message },
      { status: 502, headers: catalogCorsHeaders() },
    );
  }
}

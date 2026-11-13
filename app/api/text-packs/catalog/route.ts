import { originFromRequest } from "@/lib/catalog";
import { authorizeDashboard } from "@/lib/dashboard-auth";
import {
  assertTextCatalogWritable,
  getTextPackCatalog,
  putTextPackCatalog,
} from "@/lib/text-catalog-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/** GET — text effects + templates (Storage first, seed fallback). */
export async function GET(request: Request) {
  const catalog = await getTextPackCatalog(originFromRequest(request));
  return Response.json(catalog, {
    headers: {
      ...corsHeaders(),
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
    },
  });
}

/** PUT — dashboard save to Supabase Storage (no redeploy). */
export async function PUT(request: Request) {
  if (!authorizeDashboard(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: corsHeaders() });
  }
  try {
    assertTextCatalogWritable(body);
    const saved = await putTextPackCatalog(body);
    return Response.json(saved, {
      headers: { ...corsHeaders(), "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "save_failed", message },
      { status: 400, headers: corsHeaders() },
    );
  }
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-dashboard-secret",
  };
}

import { catalogCorsHeaders } from "@/lib/transitions";
import {
  assertCatalogWritable,
  getTransitionCatalog,
  putTransitionCatalog,
} from "@/lib/transition-catalog-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorizeWrite(request: Request): boolean {
  const secret = process.env.DASHBOARD_SECRET?.trim();
  if (!secret) {
    // Local/dev convenience only — never allow open writes in production.
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("x-dashboard-secret")?.trim();
  if (header && header === secret) return true;
  const url = new URL(request.url);
  const query = url.searchParams.get("secret")?.trim();
  return Boolean(query && query === secret);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: catalogCorsHeaders(),
  });
}

/** GET — catalog for Flutter + dashboard (Storage first, seed fallback). */
export async function GET() {
  const catalog = await getTransitionCatalog();
  return Response.json(catalog, {
    headers: {
      ...catalogCorsHeaders(),
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
    },
  });
}

/** PUT — dashboard save to Supabase Storage (no redeploy). */
export async function PUT(request: Request) {
  if (!authorizeWrite(request)) {
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

  try {
    assertCatalogWritable(body);
    const incoming = body;
    // Bump version on every successful save so clients can detect freshness.
    const next = {
      ...incoming,
      version: Math.max(1, Math.floor(Number(incoming.version) || 1) + 1),
    };
    const saved = await putTransitionCatalog(next);
    return Response.json(saved, {
      headers: {
        ...catalogCorsHeaders(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "save_failed", message },
      { status: 400, headers: catalogCorsHeaders() },
    );
  }
}

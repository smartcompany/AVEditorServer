import { authorizeDashboard } from "@/lib/dashboard-auth";
import {
  assertPlansConfigWritable,
  getPlansConfig,
  putPlansConfig,
} from "@/lib/plans-config-store";
import { catalogCorsHeaders } from "@/lib/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: catalogCorsHeaders(),
  });
}

/** GET — plans + economy for Flutter + dashboard. */
export async function GET() {
  const config = await getPlansConfig();
  return Response.json(config, {
    headers: {
      ...catalogCorsHeaders(),
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
    },
  });
}

/** PUT — dashboard save to Supabase Storage. */
export async function PUT(request: Request) {
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

  try {
    assertPlansConfigWritable(body);
    const next = {
      ...body,
      version: Math.max(1, Math.floor(Number(body.version) || 1) + 1),
    };
    const saved = await putPlansConfig(next);
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

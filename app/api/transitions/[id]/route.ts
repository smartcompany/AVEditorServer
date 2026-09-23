import { corsHeaders } from "@/lib/transitions";
import { getTransitionCatalog } from "@/lib/transition-catalog-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

type Params = { params: Promise<{ id: string }> };

/** GET /api/transitions/:id */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const catalog = await getTransitionCatalog();
  const item = catalog.items.find((entry) => entry.id === id);
  if (!item) {
    return Response.json(
      { error: "not_found", id },
      { status: 404, headers: corsHeaders() },
    );
  }
  return Response.json(item, {
    headers: {
      ...corsHeaders(),
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
    },
  });
}

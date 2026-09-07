import { buildTransitionCatalog, corsHeaders } from "@/lib/transitions";

export const runtime = "edge";

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
  const catalog = buildTransitionCatalog();
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
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

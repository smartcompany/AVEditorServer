import { buildTransitionCatalog, corsHeaders } from "@/lib/transitions";

export const runtime = "edge";

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

/** GET /api/transitions — flat list, optional ?category= */
export function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category")?.trim().toLowerCase();
  const catalog = buildTransitionCatalog();
  const items = category
    ? catalog.items.filter(
        (item) =>
          item.category.toLowerCase() === category ||
          catalog.categories.some(
            (c) =>
              c.id.toLowerCase() === category &&
              c.items.some((i) => i.id === item.id),
          ),
      )
    : catalog.items;

  return Response.json(
    { version: catalog.version, items },
    {
      headers: {
        ...corsHeaders(),
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

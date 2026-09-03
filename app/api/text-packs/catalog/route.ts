import { buildCatalog, originFromRequest } from "@/lib/catalog";

export const runtime = "edge";

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export function GET(request: Request) {
  const origin = originFromRequest(request);
  const catalog = buildCatalog(origin);

  return Response.json(catalog, {
    headers: {
      ...corsHeaders(),
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

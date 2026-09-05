import { buildTransitionCatalog, corsHeaders } from "@/lib/transitions";

export const runtime = "edge";

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export function GET() {
  return Response.json(buildTransitionCatalog(), {
    headers: {
      ...corsHeaders(),
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

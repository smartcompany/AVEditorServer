import { autocompleteSuggestions, corsHeaders } from "@/lib/music";

export const runtime = "edge";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  const prefix =
    new URL(request.url).searchParams.get("q") ??
    new URL(request.url).searchParams.get("prefix") ??
    "";

  try {
    const suggestions = await autocompleteSuggestions(prefix, 10);
    return Response.json(
      { configured: true, suggestions },
      {
        headers: {
          ...corsHeaders(),
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        suggestions: [],
        error: error instanceof Error ? error.message : "autocomplete_failed",
      },
      { status: 502, headers: corsHeaders() },
    );
  }
}

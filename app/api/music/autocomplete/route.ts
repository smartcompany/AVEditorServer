import {
  autocompleteSuggestions,
  corsHeaders,
  type CatalogKind,
} from "@/lib/music";

export const runtime = "edge";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function parseKind(raw: string | null): CatalogKind {
  return raw?.trim().toLowerCase() === "sfx" ? "sfx" : "music";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const prefix =
    params.get("q") ?? params.get("prefix") ?? "";
  const kind = parseKind(params.get("kind"));

  try {
    const suggestions = await autocompleteSuggestions(prefix, 10, kind);
    return Response.json(
      { configured: true, kind, suggestions },
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
        kind,
        suggestions: [],
        error: error instanceof Error ? error.message : "autocomplete_failed",
      },
      { status: 502, headers: corsHeaders() },
    );
  }
}

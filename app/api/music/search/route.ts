import {
  CATALOG_NOTE,
  corsHeaders,
  featuredTracks,
  searchTracks,
} from "@/lib/music";

export const runtime = "edge";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? searchParams.get("query") ?? "").trim();
  const limit = Math.min(
    Number(searchParams.get("limit") ?? (query ? 20 : 24)),
    40,
  );
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  try {
    const { tracks, provider } = query
      ? await searchTracks(query, limit, offset)
      : await featuredTracks(limit);

    return Response.json(
      {
        configured: true,
        provider,
        tracks,
        attribution: CATALOG_NOTE,
      },
      {
        headers: {
          ...corsHeaders(),
          "Cache-Control": query
            ? "public, s-maxage=60, stale-while-revalidate=300"
            : "public, s-maxage=15, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        tracks: [],
        attribution: CATALOG_NOTE,
        error: error instanceof Error ? error.message : "music_search_failed",
      },
      { status: 502, headers: corsHeaders() },
    );
  }
}

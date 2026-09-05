import {
  CATALOG_NOTE,
  corsHeaders,
  featuredTracks,
  listGenres,
  searchTracks,
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
  const { searchParams } = new URL(request.url);
  const kind = parseKind(searchParams.get("kind"));
  const genre = (searchParams.get("genre") ?? "").trim();
  const query = (
    searchParams.get("q") ??
    searchParams.get("query") ??
    ""
  ).trim();
  // Genre chip alone, or free-text search (search wins when both set).
  const effectiveQuery = query || genre;
  const limit = Math.min(
    Number(searchParams.get("limit") ?? (effectiveQuery ? 20 : 24)),
    40,
  );
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  try {
    const { tracks, provider } = effectiveQuery
      ? await searchTracks(effectiveQuery, limit, offset, kind)
      : await featuredTracks(limit, kind);

    return Response.json(
      {
        configured: true,
        provider,
        kind,
        genres: listGenres(kind).map((g) => ({
          id: g.id,
          query: g.query,
          label: g.labels[0],
        })),
        tracks,
        attribution: CATALOG_NOTE,
      },
      {
        headers: {
          ...corsHeaders(),
          "Cache-Control": effectiveQuery
            ? "public, s-maxage=60, stale-while-revalidate=300"
            : "public, s-maxage=15, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        kind,
        tracks: [],
        genres: listGenres(kind).map((g) => ({
          id: g.id,
          query: g.query,
          label: g.labels[0],
        })),
        attribution: CATALOG_NOTE,
        error: error instanceof Error ? error.message : "music_search_failed",
      },
      { status: 502, headers: corsHeaders() },
    );
  }
}

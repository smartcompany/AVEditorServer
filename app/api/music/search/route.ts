import {
  corsHeaders,
  featuredTracks,
  isJamendoConfigured,
  searchTracks,
} from "@/lib/jamendo";

export const runtime = "edge";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  if (!isJamendoConfigured()) {
    return Response.json(
      {
        configured: false,
        tracks: [],
        error: "Set JAMENDO_CLIENT_ID on the server (Jamendo Dev Portal).",
        attribution: "Jamendo — Creative Commons. Attribution may be required.",
      },
      { status: 503, headers: corsHeaders() },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? searchParams.get("query") ?? "").trim();
  const limit = Math.min(
    Number(searchParams.get("limit") ?? (query ? 20 : 24)),
    40,
  );
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  try {
    const tracks = query
      ? await searchTracks(query, limit, offset)
      : await featuredTracks(limit);

    return Response.json(
      {
        configured: true,
        tracks,
        attribution: "Jamendo — Creative Commons. Attribution may be required.",
      },
      {
        headers: {
          ...corsHeaders(),
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        tracks: [],
        error: error instanceof Error ? error.message : "music_search_failed",
      },
      { status: 502, headers: corsHeaders() },
    );
  }
}

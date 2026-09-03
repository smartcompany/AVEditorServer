import {
  corsHeaders,
  mixkitDownloadUrl,
  pixabayDownloadUrl,
} from "@/lib/music";

export const runtime = "edge";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/** Proxies a catalog MP3 so the Flutter client never embeds API keys. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json(
      { error: "missing_id" },
      { status: 400, headers: corsHeaders() },
    );
  }

  try {
    const upstreamUrl =
      mixkitDownloadUrl(id) ?? (await pixabayDownloadUrl(id));
    if (!upstreamUrl) {
      return Response.json(
        { error: "unknown_track" },
        { status: 404, headers: corsHeaders() },
      );
    }

    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "audio/mpeg,audio/*,*/*" },
    });
    if (!upstream.ok) {
      return Response.json(
        { error: `music_download_failed:${upstream.status}` },
        { status: 502, headers: corsHeaders() },
      );
    }

    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `attachment; filename="track-${id}.mp3"`,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "download_failed",
      },
      { status: 502, headers: corsHeaders() },
    );
  }
}

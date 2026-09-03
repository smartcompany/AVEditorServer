import {
  corsHeaders,
  isJamendoConfigured,
  jamendoDownloadUrl,
} from "@/lib/jamendo";

export const runtime = "edge";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/** Proxies a Jamendo track download so the Flutter client never embeds the API key. */
export async function GET(request: Request) {
  if (!isJamendoConfigured()) {
    return Response.json(
      { error: "jamendo_not_configured" },
      { status: 503, headers: corsHeaders() },
    );
  }

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json(
      { error: "missing_id" },
      { status: 400, headers: corsHeaders() },
    );
  }

  try {
    const upstream = await fetch(jamendoDownloadUrl(id));
    if (!upstream.ok) {
      return Response.json(
        { error: `jamendo_download_failed:${upstream.status}` },
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

export const runtime = "edge";

/**
 * Share destinations after export. Array order is the 2×2 grid order
 * (row-major). The client shows nothing when this catalog is empty/unavailable.
 */
const catalog = {
  version: 0,
  targets: [
    {
      kind: "youtube",
      label: {
        ko: "YouTube",
        en: "YouTube",
        ja: "YouTube",
        zh: "YouTube",
      },
    },
    {
      kind: "tiktok",
      label: { ko: "TikTok", en: "TikTok", ja: "TikTok", zh: "TikTok" },
    },
    {
      kind: "instagram",
      label: { ko: "Instagram", en: "Instagram", ja: "Instagram", zh: "Instagram" },
    },
    {
      kind: "facebook",
      label: { ko: "Facebook", en: "Facebook", ja: "Facebook", zh: "Facebook" },
    },
  ],
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export function GET() {
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

export const runtime = "edge";

/**
 * Share destinations after export. Array order is priority:
 * the first entry is the large button, the rest are icon buttons.
 * `more` is not listed — the app always appends the system share action.
 */
const catalog = {
  version: 1,
  targets: [
    {
      kind: "youtube",
      label: {
        ko: "YouTube에 공유",
        en: "Share to YouTube",
        ja: "YouTubeにシェア",
        zh: "分享到 YouTube",
      },
    },
    {
      kind: "instagram",
      label: { ko: "Instagram", en: "Instagram", ja: "Instagram", zh: "Instagram" },
    },
    {
      kind: "whatsapp",
      label: { ko: "WhatsApp", en: "WhatsApp", ja: "WhatsApp", zh: "WhatsApp" },
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

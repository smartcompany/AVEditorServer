export const runtime = "edge";

export function GET() {
  return Response.json({
    ok: true,
    service: "aveditor-server",
    endpoints: {
      catalog: "/text_packs/catalog.json",
      lottie: "/text_packs/lottie/{name}.json",
      transitions: "/transitions/catalog.json",
      transitionsList: "/api/transitions",
      health: "/api/health",
    },
  });
}

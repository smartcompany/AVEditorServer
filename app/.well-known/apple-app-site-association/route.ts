/**
 * Apple universal links for the iOS app. TikTok Share Kit returns to
 * https://aveditorserver.vercel.app/tiktok/callback, which iOS hands to the
 * app only when this file lists the app and path.
 */
const APP_ID = "NTCK5U8AWD.com.smartcompany.aveditor";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs: [APP_ID],
            components: [{ "/": "/tiktok/callback*", comment: "TikTok Share Kit return" }],
          },
        ],
      },
    },
    { headers: { "Content-Type": "application/json" } },
  );
}

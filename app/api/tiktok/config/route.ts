import { TIKTOK_REDIRECT_URI, TIKTOK_SCOPES, tiktokClientKey } from "@/lib/tiktok";

/** Public Login Kit settings for the app (the client key is not secret). */
export const dynamic = "force-dynamic";

export function GET() {
  const clientKey = tiktokClientKey();
  if (!clientKey) {
    return Response.json({ error: "server_not_configured" }, { status: 503 });
  }
  return Response.json({
    client_key: clientKey,
    redirect_uri: TIKTOK_REDIRECT_URI,
    scopes: TIKTOK_SCOPES,
  });
}

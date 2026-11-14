/**
 * TikTok Login Kit / Content Posting API helpers.
 *
 * The client secret never leaves the server: the app sends the OAuth code
 * (or refresh token) here and gets the user's tokens back. Content posting
 * itself is done by the app with that user token.
 *
 * Env: TIKTOK_CLIENT_KEY (sandbox `sb…` or production `aw…`),
 *      TIKTOK_CLIENT_SECRET (the secret of that same key).
 */
export const TIKTOK_REDIRECT_URI = "https://aveditorserver.vercel.app/tiktok/callback";
export const TIKTOK_SCOPES = ["user.info.basic", "video.publish"];

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

export function tiktokClientKey(): string | null {
  return process.env.TIKTOK_CLIENT_KEY?.trim() || null;
}

function tiktokClientSecret(): string | null {
  return process.env.TIKTOK_CLIENT_SECRET?.trim() || null;
}

export type TikTokTokenResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; error: string; description?: string };

/** Exchanges an auth code or refresh token at TikTok's token endpoint. */
export async function exchangeTikTokToken(
  grant: { code: string; codeVerifier?: string } | { refreshToken: string },
): Promise<TikTokTokenResult> {
  const key = tiktokClientKey();
  const secret = tiktokClientSecret();
  if (!key || !secret) {
    return { ok: false, status: 500, error: "server_not_configured" };
  }
  const form = new URLSearchParams({ client_key: key, client_secret: secret });
  if ("code" in grant) {
    form.set("grant_type", "authorization_code");
    form.set("code", grant.code);
    form.set("redirect_uri", TIKTOK_REDIRECT_URI);
    if (grant.codeVerifier) form.set("code_verifier", grant.codeVerifier);
  } else {
    form.set("grant_type", "refresh_token");
    form.set("refresh_token", grant.refreshToken);
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof body.error === "string" || !body.access_token) {
    return {
      ok: false,
      status: res.ok ? 400 : res.status,
      error: typeof body.error === "string" ? body.error : "token_exchange_failed",
      description:
        typeof body.error_description === "string" ? body.error_description : undefined,
    };
  }
  return { ok: true, body };
}

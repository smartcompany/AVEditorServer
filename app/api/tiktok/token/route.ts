import { exchangeTikTokToken } from "@/lib/tiktok";

/**
 * POST { code, code_verifier? }  → user tokens for a fresh login
 * POST { refresh_token }        → renewed tokens
 * Returns TikTok's token JSON (access_token, refresh_token, expires_in,
 * refresh_expires_in, open_id, scope) or { error, error_description }.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as
    | { code?: unknown; code_verifier?: unknown; refresh_token?: unknown }
    | null;
  const code = typeof input?.code === "string" ? input.code : "";
  const refreshToken = typeof input?.refresh_token === "string" ? input.refresh_token : "";
  if (!code && !refreshToken) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const result = await exchangeTikTokToken(
    code
      ? {
          code,
          codeVerifier:
            typeof input?.code_verifier === "string" ? input.code_verifier : undefined,
        }
      : { refreshToken },
  );
  if (!result.ok) {
    return Response.json(
      { error: result.error, error_description: result.description },
      { status: result.status },
    );
  }
  return Response.json(result.body, { headers: { "Cache-Control": "no-store" } });
}

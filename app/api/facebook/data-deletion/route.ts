import { deletionConfirmationCode, parseFacebookSignedRequest } from "@/lib/facebook-data-deletion";
import { SITE } from "@/lib/site";

export const runtime = "edge";

/**
 * Facebook Data Deletion Request callback.
 * Dashboard → App settings → Advanced / Privacy → Data deletion request URL:
 *   {SITE.origin}/api/facebook/data-deletion
 *
 * Requires FACEBOOK_APP_SECRET in the server environment (never in the client).
 */
export async function POST(request: Request) {
  const secret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!secret) {
    return Response.json(
      { error: "FACEBOOK_APP_SECRET is not configured on the server" },
      { status: 500 },
    );
  }

  let signedRequest: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const value = form.get("signed_request");
    signedRequest = typeof value === "string" ? value : null;
  } else if (contentType.includes("application/json")) {
    const body = (await request.json()) as { signed_request?: string };
    signedRequest = body.signed_request ?? null;
  } else {
    const form = await request.formData().catch(() => null);
    const value = form?.get("signed_request");
    signedRequest = typeof value === "string" ? value : null;
  }

  if (!signedRequest) {
    return Response.json({ error: "signed_request missing" }, { status: 400 });
  }

  const payload = await parseFacebookSignedRequest(signedRequest, secret);
  if (!payload?.user_id) {
    return Response.json({ error: "invalid signed_request" }, { status: 400 });
  }

  // EasyClip does not store Facebook account data on the server (share uses
  // the on-device Facebook SDK). Acknowledge the request and point at the
  // status page Facebook expects.
  const confirmationCode = deletionConfirmationCode(payload.user_id);
  const url = `${SITE.origin}/data-deletion/status?code=${encodeURIComponent(confirmationCode)}`;

  return Response.json({
    url,
    confirmation_code: confirmationCode,
  });
}

export function GET() {
  return Response.json({
    ok: true,
    purpose: "Facebook data deletion callback (POST signed_request)",
    instructions: `${SITE.origin}/data-deletion`,
  });
}

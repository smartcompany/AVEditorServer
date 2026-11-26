import {
  createDashboardSessionCookie,
  DASHBOARD_COOKIE,
  dashboardSessionCookieOptions,
  verifyGoogleDashboardIdToken,
} from "@/lib/dashboard-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSecure(request: Request): boolean {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0];
  return (proto ?? url.protocol.replace(":", "")) === "https";
}

function dashboardOrigin(request: Request): string {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0] ??
    url.protocol.replace(":", "");
  if (host) return `${proto}://${host}`;
  return url.origin;
}

/**
 * Google Identity Services redirect UX posts here with `credential`.
 * Also accepts JSON `{ idToken }` for debugging.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let idToken = "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const credential = form.get("credential");
    if (typeof credential === "string") idToken = credential.trim();
  } else {
    try {
      const body = await request.json();
      if (body && typeof body.idToken === "string") {
        idToken = body.idToken.trim();
      } else if (body && typeof body.credential === "string") {
        idToken = body.credential.trim();
      }
    } catch {
      /* ignore */
    }
  }

  const origin = dashboardOrigin(request);
  if (!idToken) {
    return Response.redirect(
      `${origin}/dashboard?login_error=missing_credential`,
      303,
    );
  }

  const verified = await verifyGoogleDashboardIdToken(idToken);
  if ("error" in verified) {
    return Response.redirect(
      `${origin}/dashboard?login_error=${encodeURIComponent(verified.error)}`,
      303,
    );
  }

  const cookie = await createDashboardSessionCookie(verified.email);
  if (!cookie) {
    return Response.redirect(
      `${origin}/dashboard?login_error=session_secret_missing`,
      303,
    );
  }

  const response = Response.redirect(`${origin}/dashboard`, 303);
  const opts = dashboardSessionCookieOptions(isSecure(request));
  response.headers.append(
    "Set-Cookie",
    `${DASHBOARD_COOKIE}=${encodeURIComponent(cookie)}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Lax${opts.secure ? "; Secure" : ""}`,
  );
  return response;
}

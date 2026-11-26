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

function redirect(
  location: string,
  cookieValue?: string,
  secure = true,
): Response {
  const headers = new Headers({ Location: location });
  if (cookieValue) {
    const opts = dashboardSessionCookieOptions(secure);
    headers.set(
      "Set-Cookie",
      `${DASHBOARD_COOKIE}=${encodeURIComponent(cookieValue)}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Lax${opts.secure ? "; Secure" : ""}`,
    );
  }
  // Response.redirect() headers are immutable — build a fresh Response.
  return new Response(null, { status: 303, headers });
}

/**
 * Google Identity Services redirect UX posts here with `credential`.
 * Also accepts JSON `{ idToken }` for debugging.
 */
export async function POST(request: Request) {
  try {
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
      return redirect(`${origin}/dashboard?login_error=missing_credential`);
    }

    const verified = await verifyGoogleDashboardIdToken(idToken);
    if ("error" in verified) {
      return redirect(
        `${origin}/dashboard?login_error=${encodeURIComponent(verified.error)}`,
      );
    }

    const cookie = await createDashboardSessionCookie(verified.email);
    if (!cookie) {
      return redirect(
        `${origin}/dashboard?login_error=session_secret_missing`,
      );
    }

    return redirect(
      `${origin}/dashboard`,
      cookie,
      isSecure(request),
    );
  } catch (err) {
    console.error("[dashboard/google/callback]", err);
    const origin = dashboardOrigin(request);
    return redirect(`${origin}/dashboard?login_error=callback_failed`);
  }
}

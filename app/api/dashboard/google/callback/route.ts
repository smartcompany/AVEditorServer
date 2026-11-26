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
  return new Response(null, { status: 303, headers });
}

async function readIdToken(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    for (const key of ["credential", "id_token", "idToken"]) {
      const value = form.get(key);
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  }

  try {
    const body = await request.json();
    if (body && typeof body === "object") {
      const raw = body as Record<string, unknown>;
      for (const key of ["credential", "id_token", "idToken"]) {
        const value = raw[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

/**
 * Google OIDC form_post / GIS redirect posts the ID token here.
 */
export async function POST(request: Request) {
  const origin = dashboardOrigin(request);
  try {
    const idToken = await readIdToken(request);
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

    return redirect(`${origin}/dashboard`, cookie, isSecure(request));
  } catch (err) {
    console.error("[dashboard/google/callback]", err);
    return redirect(`${origin}/dashboard?login_error=callback_failed`);
  }
}

/** Accidental GET — send back to login. */
export async function GET(request: Request) {
  const origin = dashboardOrigin(request);
  return redirect(`${origin}/dashboard?login_error=missing_credential`);
}

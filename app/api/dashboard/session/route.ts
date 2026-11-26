import {
  createDashboardSessionCookie,
  DASHBOARD_ALLOWED_EMAIL,
  DASHBOARD_COOKIE,
  dashboardSessionCookieOptions,
  dashboardSessionEmail,
  googleOAuthClientId,
  secretMatches,
  verifyGoogleDashboardIdToken,
} from "@/lib/dashboard-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSecure(request: Request): boolean {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0];
  return (proto ?? url.protocol.replace(":", "")) === "https";
}

function setSessionCookie(response: Response, value: string, secure: boolean) {
  const opts = dashboardSessionCookieOptions(secure);
  response.headers.append(
    "Set-Cookie",
    `${DASHBOARD_COOKIE}=${encodeURIComponent(value)}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Lax${opts.secure ? "; Secure" : ""}`,
  );
}

function clearSessionCookie(response: Response, secure: boolean) {
  response.headers.append(
    "Set-Cookie",
    `${DASHBOARD_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
  );
}

/** Who is signed in (if anyone). */
export async function GET(request: Request) {
  const email = await dashboardSessionEmail(request);
  return Response.json({
    authenticated: email !== null,
    email,
    allowedEmail: DASHBOARD_ALLOWED_EMAIL,
    googleClientConfigured: Boolean(googleOAuthClientId()),
  });
}

/**
 * Body:
 * - { idToken } Google credential (popup / client callback)
 * - { secret } DASHBOARD_SECRET password fallback
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  // Password fallback — same env secret used to sign the session cookie.
  if (typeof raw.secret === "string" && raw.secret.trim()) {
    if (!secretMatches(raw.secret)) {
      return Response.json({ error: "invalid_secret" }, { status: 401 });
    }
    // Session cookie still encodes the allowlisted admin email.
    const cookie = await createDashboardSessionCookie(DASHBOARD_ALLOWED_EMAIL);
    if (!cookie) {
      return Response.json({ error: "session_secret_missing" }, { status: 503 });
    }
    const response = Response.json({
      authenticated: true,
      email: DASHBOARD_ALLOWED_EMAIL,
    });
    setSessionCookie(response, cookie, isSecure(request));
    return response;
  }

  const idToken =
    typeof raw.idToken === "string"
      ? raw.idToken.trim()
      : typeof raw.credential === "string"
        ? raw.credential.trim()
        : "";
  if (!idToken) {
    return Response.json({ error: "idToken_required" }, { status: 400 });
  }

  const verified = await verifyGoogleDashboardIdToken(idToken);
  if ("error" in verified) {
    const status =
      verified.error === "email_not_allowed"
        ? 403
        : verified.error === "google_client_id_missing"
          ? 503
          : 401;
    return Response.json({ error: verified.error }, { status });
  }

  const cookie = await createDashboardSessionCookie(verified.email);
  if (!cookie) {
    return Response.json({ error: "session_secret_missing" }, { status: 503 });
  }

  const response = Response.json({
    authenticated: true,
    email: verified.email,
  });
  setSessionCookie(response, cookie, isSecure(request));
  return response;
}

/** Sign out. */
export async function DELETE(request: Request) {
  const response = Response.json({ authenticated: false });
  clearSessionCookie(response, isSecure(request));
  return response;
}

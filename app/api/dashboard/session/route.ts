import {
  createDashboardSessionCookie,
  DASHBOARD_ALLOWED_EMAIL,
  DASHBOARD_COOKIE,
  dashboardSessionCookieOptions,
  dashboardSessionEmail,
  googleOAuthClientId,
  verifyGoogleDashboardIdToken,
} from "@/lib/dashboard-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSecure(request: Request): boolean {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0];
  return (proto ?? url.protocol.replace(":", "")) === "https";
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

/** Exchange a Google ID token for a dashboard session cookie. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const idToken =
    body &&
    typeof body === "object" &&
    typeof (body as { idToken?: unknown }).idToken === "string"
      ? (body as { idToken: string }).idToken.trim()
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
    return Response.json(
      { error: "session_secret_missing" },
      { status: 503 },
    );
  }

  const response = Response.json({
    authenticated: true,
    email: verified.email,
  });
  const opts = dashboardSessionCookieOptions(isSecure(request));
  response.headers.append(
    "Set-Cookie",
    `${DASHBOARD_COOKIE}=${encodeURIComponent(cookie)}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Strict${opts.secure ? "; Secure" : ""}`,
  );
  return response;
}

/** Sign out. */
export async function DELETE(request: Request) {
  const response = Response.json({ authenticated: false });
  const secure = isSecure(request);
  response.headers.append(
    "Set-Cookie",
    `${DASHBOARD_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`,
  );
  return response;
}

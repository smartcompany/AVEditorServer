import { NextResponse } from "next/server";
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

function withSessionCookie(
  data: unknown,
  cookieValue: string | null,
  secure: boolean,
  status = 200,
) {
  const res = NextResponse.json(data, { status });
  const opts = dashboardSessionCookieOptions(secure);
  if (cookieValue) {
    res.cookies.set({
      name: DASHBOARD_COOKIE,
      value: cookieValue,
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      path: opts.path,
      maxAge: opts.maxAge,
    });
  }
  return res;
}

function clearSession(secure: boolean) {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.set({
    name: DASHBOARD_COOKIE,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

/** Who is signed in (if anyone). */
export async function GET(request: Request) {
  const email = await dashboardSessionEmail(request);
  return NextResponse.json({
    authenticated: email !== null,
    email,
    allowedEmail: DASHBOARD_ALLOWED_EMAIL,
    googleClientConfigured: Boolean(googleOAuthClientId()),
  });
}

/**
 * Body:
 * - { idToken } Google credential
 * - { secret } DASHBOARD_SECRET (scripts / emergency)
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const secure = isSecure(request);

  if (typeof raw.secret === "string" && raw.secret.trim()) {
    if (!secretMatches(raw.secret)) {
      return NextResponse.json({ error: "invalid_secret" }, { status: 401 });
    }
    const cookie = await createDashboardSessionCookie(DASHBOARD_ALLOWED_EMAIL);
    if (!cookie) {
      return NextResponse.json(
        { error: "session_secret_missing" },
        { status: 503 },
      );
    }
    return withSessionCookie(
      { authenticated: true, email: DASHBOARD_ALLOWED_EMAIL },
      cookie,
      secure,
    );
  }

  const idToken =
    typeof raw.idToken === "string"
      ? raw.idToken.trim()
      : typeof raw.credential === "string"
        ? raw.credential.trim()
        : "";
  if (!idToken) {
    return NextResponse.json({ error: "idToken_required" }, { status: 400 });
  }

  const verified = await verifyGoogleDashboardIdToken(idToken);
  if ("error" in verified) {
    const status =
      verified.error === "email_not_allowed"
        ? 403
        : verified.error === "google_client_id_missing"
          ? 503
          : 401;
    return NextResponse.json({ error: verified.error }, { status });
  }

  const cookie = await createDashboardSessionCookie(verified.email);
  if (!cookie) {
    return NextResponse.json(
      { error: "session_secret_missing" },
      { status: 503 },
    );
  }

  return withSessionCookie(
    { authenticated: true, email: verified.email },
    cookie,
    secure,
  );
}

/** Sign out. */
export async function DELETE(request: Request) {
  return clearSession(isSecure(request));
}

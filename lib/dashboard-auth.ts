/**
 * Dashboard auth:
 * - Browser: Google Sign-In (GOOGLE_CLIENT_ID) → session cookie for allowlisted email
 * - Scripts: raw DASHBOARD_SECRET via `x-dashboard-secret` / `?secret=`
 */
import { OAuth2Client } from "google-auth-library";

export const DASHBOARD_COOKIE = "aveditor_dashboard";

const SCOPE = "aveditor-dashboard-session-v2";

/** Only this Google account may use the dashboard UI. */
export const DASHBOARD_ALLOWED_EMAIL = (
  process.env.DASHBOARD_ALLOWED_EMAIL?.trim() || "gunnylove@gmail.com"
).toLowerCase();

function configuredSecret(): string | null {
  return process.env.DASHBOARD_SECRET?.trim() || null;
}

export function googleOAuthClientId(): string | null {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    null
  );
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Signed session cookie for an allowlisted email. */
export async function createDashboardSessionCookie(
  email: string,
): Promise<string | null> {
  const secret = configuredSecret();
  if (!secret) return null;
  const normalized = email.trim().toLowerCase();
  if (normalized !== DASHBOARD_ALLOWED_EMAIL) return null;
  const sig = await hmacHex(secret, `${SCOPE}:${normalized}`);
  return `${normalized}.${sig}`;
}

export async function emailFromDashboardSession(
  cookie: string | null,
): Promise<string | null> {
  if (!cookie) return null;
  const secret = configuredSecret();
  if (!secret) return null;
  const dot = cookie.indexOf(".");
  if (dot <= 0) return null;
  const email = cookie.slice(0, dot).toLowerCase();
  const sig = cookie.slice(dot + 1);
  if (email !== DASHBOARD_ALLOWED_EMAIL) return null;
  const expected = await hmacHex(secret, `${SCOPE}:${email}`);
  if (sig !== expected) return null;
  return email;
}

export function isDashboardEmailAllowed(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === DASHBOARD_ALLOWED_EMAIL;
}

/**
 * Verify a Google Identity Services ID token and return the email when
 * allowlisted + verified.
 */
export async function verifyGoogleDashboardIdToken(
  idToken: string,
): Promise<{ email: string } | { error: string }> {
  const clientId = googleOAuthClientId();
  if (!clientId) {
    return { error: "google_client_id_missing" };
  }
  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();
    if (!email || payload?.email_verified !== true) {
      return { error: "email_unverified" };
    }
    if (!isDashboardEmailAllowed(email)) {
      return { error: "email_not_allowed" };
    }
    return { email };
  } catch {
    return { error: "invalid_id_token" };
  }
}

export async function authorizeDashboard(request: Request): Promise<boolean> {
  const secret = configuredSecret();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("x-dashboard-secret")?.trim();
  if (header && header === secret) return true;
  const query = new URL(request.url).searchParams.get("secret")?.trim();
  if (query && query === secret) return true;

  const cookie = readCookie(request, DASHBOARD_COOKIE);
  const email = await emailFromDashboardSession(cookie);
  return email !== null;
}

export async function dashboardSessionEmail(
  request: Request,
): Promise<string | null> {
  return emailFromDashboardSession(readCookie(request, DASHBOARD_COOKIE));
}

export function dashboardSessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

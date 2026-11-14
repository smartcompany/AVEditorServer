/**
 * Dashboard auth, keyed on DASHBOARD_SECRET from the server environment.
 *
 * - Opening /dashboard makes the middleware set an HttpOnly session cookie
 *   whose value is HMAC-SHA256(DASHBOARD_SECRET, scope). The secret itself
 *   never reaches the browser, and the dashboard UI asks for nothing.
 * - Dashboard APIs accept that cookie, or the raw secret in
 *   `x-dashboard-secret` / `?secret=` for scripts.
 *
 * Anyone who can open /dashboard gets the cookie, so keep the dashboard URL
 * private (e.g. Vercel Deployment Protection) if that matters.
 */
export const DASHBOARD_COOKIE = "aveditor_dashboard";

const SCOPE = "aveditor-dashboard-session-v1";

function configuredSecret(): string | null {
  return process.env.DASHBOARD_SECRET?.trim() || null;
}

/** Session token for the dashboard cookie, or null when no secret is set. */
export async function dashboardSessionToken(): Promise<string | null> {
  const secret = configuredSecret();
  if (!secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(SCOPE));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

export async function authorizeDashboard(request: Request): Promise<boolean> {
  const secret = configuredSecret();
  if (!secret) {
    // No secret configured: open only outside production (local work).
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("x-dashboard-secret")?.trim();
  if (header && header === secret) return true;
  const query = new URL(request.url).searchParams.get("secret")?.trim();
  if (query && query === secret) return true;

  const cookie = readCookie(request, DASHBOARD_COOKIE);
  if (!cookie) return false;
  const token = await dashboardSessionToken();
  return token !== null && cookie === token;
}

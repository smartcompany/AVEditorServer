/**
 * Dashboard write/read auth. Requests carry DASHBOARD_SECRET in the
 * `x-dashboard-secret` header (or `?secret=`). Without a configured secret
 * only non-production builds are open, for local work.
 */
export function authorizeDashboard(request: Request): boolean {
  const secret = process.env.DASHBOARD_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("x-dashboard-secret")?.trim();
  if (header && header === secret) return true;
  const url = new URL(request.url);
  const query = url.searchParams.get("secret")?.trim();
  return Boolean(query && query === secret);
}

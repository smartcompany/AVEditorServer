import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

export async function requireFirebaseUser(
  request: Request,
): Promise<{ uid: string; email?: string }> {
  const user = await optionalFirebaseUser(request);
  if (!user) {
    const err = new Error("unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return user;
}

/** Returns null when Authorization is missing or invalid. */
export async function optionalFirebaseUser(
  request: Request,
): Promise<{ uid: string; email?: string } | null> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  try {
    const decoded = await verifyFirebaseIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

export async function requireFirebaseUser(
  request: Request,
): Promise<{ uid: string; email?: string }> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    const err = new Error("unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  const decoded = await verifyFirebaseIdToken(token);
  return { uid: decoded.uid, email: decoded.email };
}

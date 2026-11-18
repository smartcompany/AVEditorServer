import { NextRequest, NextResponse } from "next/server";

import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function bearer(request: NextRequest): string {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

/** GET /api/users/me — current Firebase user profile (upsert lightweight row). */
export async function GET(request: NextRequest) {
  const token = bearer(request);
  if (!token) return json({ error: "unauthorized" }, 401);

  try {
    const decoded = await verifyFirebaseIdToken(token);
    const id = decoded.uid;
    const displayName =
      (decoded.name as string | undefined) ??
      (decoded.email as string | undefined)?.split("@")[0] ??
      null;
    const email = (decoded.email as string | undefined) ?? null;
    const photoUrl = (decoded.picture as string | undefined) ?? null;

    if (hasSupabaseConfig()) {
      const sb = getSupabaseAdmin();
      await sb.from("aveditor_app_users").upsert(
        {
          firebase_uid: id,
          display_name: displayName,
          email,
          photo_url: photoUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "firebase_uid" },
      );
    }

    return json({
      id,
      displayName,
      email,
      photoUrl,
    });
  } catch (e) {
    console.error("[users/me GET]", e);
    return json({ error: "unauthorized" }, 401);
  }
}

/** PUT /api/users/me — optional display name update. */
export async function PUT(request: NextRequest) {
  const token = bearer(request);
  if (!token) return json({ error: "unauthorized" }, 401);

  try {
    const decoded = await verifyFirebaseIdToken(token);
    const body = (await request.json()) as { displayName?: string };
    const displayName = body.displayName?.trim() || null;

    if (hasSupabaseConfig()) {
      const sb = getSupabaseAdmin();
      await sb.from("aveditor_app_users").upsert(
        {
          firebase_uid: decoded.uid,
          display_name: displayName,
          email: (decoded.email as string | undefined) ?? null,
          photo_url: (decoded.picture as string | undefined) ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "firebase_uid" },
      );
    }

    return json({
      id: decoded.uid,
      displayName,
      email: (decoded.email as string | undefined) ?? null,
      photoUrl: (decoded.picture as string | undefined) ?? null,
    });
  } catch (e) {
    console.error("[users/me PUT]", e);
    return json({ error: "unauthorized" }, 401);
  }
}

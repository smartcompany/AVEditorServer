import { NextRequest, NextResponse } from "next/server";

import { getFirebaseAdmin, verifyFirebaseIdToken } from "@/lib/firebase/admin";
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

/** Best-effort wipe of server rows tied to a Firebase uid (App Review 5.1.1v). */
async function deleteServerAccountData(firebaseUid: string): Promise<void> {
  if (!hasSupabaseConfig()) return;
  const sb = getSupabaseAdmin();

  // Credit accounts linked to this uid — remove the account row (ledger may CASCADE
  // or remain orphaned; prefer deleting the account record Apple reviewers expect).
  await sb.from("aveditor_credit_accounts").delete().eq("firebase_uid", firebaseUid);

  // Keep store receipt history for compliance, but detach the user.
  await sb
    .from("aveditor_subscriptions")
    .update({
      firebase_uid: null,
      updated_at: new Date().toISOString(),
    })
    .eq("firebase_uid", firebaseUid);

  await sb.from("aveditor_push_tokens").delete().eq("firebase_uid", firebaseUid);
  await sb.from("aveditor_app_users").delete().eq("firebase_uid", firebaseUid);
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

/**
 * DELETE /api/users/me — delete app account server data, then Firebase Auth user.
 * Client should call this while still signed in, then clear local session.
 */
export async function DELETE(request: NextRequest) {
  const token = bearer(request);
  if (!token) return json({ error: "unauthorized" }, 401);

  try {
    const decoded = await verifyFirebaseIdToken(token);
    const uid = decoded.uid;

    try {
      await deleteServerAccountData(uid);
    } catch (e) {
      console.error("[users/me DELETE] server data", e);
      return json({ error: "server_delete_failed" }, 500);
    }

    try {
      const { auth } = getFirebaseAdmin();
      await auth.deleteUser(uid);
    } catch (e) {
      // Client may also call user.delete(); treat missing user as success.
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: unknown }).code)
          : "";
      if (code !== "auth/user-not-found") {
        console.error("[users/me DELETE] firebase", e);
        return json({ error: "firebase_delete_failed" }, 500);
      }
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[users/me DELETE]", e);
    return json({ error: "unauthorized" }, 401);
  }
}

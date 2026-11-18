import { NextRequest, NextResponse } from "next/server";

import { linkFirebaseUid } from "@/lib/credit-accounts";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { hasSupabaseConfig } from "@/lib/supabase";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** POST /api/credits/link { deviceKey } + Authorization: Bearer <Firebase ID token> */
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return json({ error: "credits_unavailable" }, 503);
  }
  try {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) return json({ error: "unauthorized" }, 401);

    const decoded = await verifyFirebaseIdToken(token);
    const body = (await request.json()) as { deviceKey?: string };
    const deviceKey = body.deviceKey?.trim();
    if (!deviceKey) return json({ error: "deviceKey_required" }, 400);

    const account = await linkFirebaseUid(deviceKey, decoded.uid);
    return json({
      balance: account.balance,
      planTier: account.plan_tier,
      firebaseUid: account.firebase_uid,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("FIREBASE_SERVICE_ACCOUNT_KEY") || msg.includes("auth/")) {
      return json({ error: "firebase_config" }, 500);
    }
    console.error("[credits link]", e);
    return json({ error: "credits_failed" }, 500);
  }
}

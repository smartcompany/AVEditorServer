import { NextRequest, NextResponse } from "next/server";

import { getFirebaseAdmin } from "@/lib/firebase/admin";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * POST /api/auth/kakao/firebase { access_token }
 * Validates Kakao token and returns a Firebase custom token (always).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { access_token?: string };
    const accessToken = body.access_token?.trim();
    if (!accessToken) return json({ error: "Access token is required" }, 400);

    const kakaoResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!kakaoResponse.ok) {
      return json({ error: "Invalid Kakao access token" }, 401);
    }

    const kakaoUser = (await kakaoResponse.json()) as { id: number };
    const kakaoId = String(kakaoUser.id);
    const uid = `kakao:${kakaoId}`;

    const { auth } = getFirebaseAdmin();
    const customToken = await auth.createCustomToken(uid, {
      provider: "kakao",
      kakaoId,
    });

    return json({
      uid,
      kakao_id: kakaoId,
      custom_token: customToken,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[auth/kakao/firebase]", e);
    if (message.includes("FIREBASE_SERVICE_ACCOUNT_KEY")) {
      return json({ error: "Firebase configuration error" }, 500);
    }
    return json({ error: `Failed to login with Kakao: ${message}` }, 500);
  }
}

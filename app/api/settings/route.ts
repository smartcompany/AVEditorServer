import { NextResponse } from "next/server";

import settings from "./settings.json";

/**
 * GET /api/settings
 * App settings read by share_lib's AdService (ios_ads / android_ads, ref,
 * down_load_url). Edit settings.json next to this file to change ads.
 */
export async function GET() {
  try {
    return NextResponse.json(settings, {
      status: 200,
      headers: {
        // Dart http reads bodies without a charset as latin1.
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[settings] Failed to load settings:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

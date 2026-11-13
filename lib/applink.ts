export const APP_DISPLAY_NAME = "ClipGo";

/**
 * Numeric App Store id. Empty until the iOS app is listed; while empty,
 * iOS visitors land on `/applink/social` (Google Play button only).
 * TODO: set after App Store release, e.g. "6700000000".
 */
export const IOS_APP_STORE_ID = "";

export const PLAY_STORE_PACKAGE = "com.smartcompany.aveditor";

export const PLAY_STORE_WEB = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

export const PLAY_STORE_MARKET = `market://details?id=${PLAY_STORE_PACKAGE}`;

export const IOS_APP_STORE_WEB = IOS_APP_STORE_ID
  ? `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`
  : "";

export const IOS_APP_STORE_ITMS = IOS_APP_STORE_ID
  ? `itms-apps://apps.apple.com/app/id${IOS_APP_STORE_ID}`
  : "";

export const APPLINK_SOCIAL_URL =
  "https://aveditorserver.vercel.app/applink/social";

export function hasIosStoreListing(): boolean {
  return IOS_APP_STORE_ID.length > 0;
}

/** Absolute store URL or relative `/applink/social` fallback for iOS without listing. */
export function pickStoreRedirect(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("android")) return PLAY_STORE_WEB;
  if (hasIosStoreListing()) return IOS_APP_STORE_WEB;
  return "/applink/social";
}

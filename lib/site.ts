/** Public site info used by the landing, privacy and terms pages. */
export const SITE = {
  appName: "EasyClip",
  /** Shown as the contact on the policy pages and in Google OAuth review. */
  supportEmail: "gunnylove@gmail.com",
  /** Last update of the privacy policy / terms (YYYY-MM-DD). */
  policyDate: "2026-11-14",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.smartcompany.aveditor",
  /**
   * Absolute origin for public policy / Facebook callback links.
   * Override with SITE_ORIGIN on Vercel if the host changes.
   */
  origin: "https://aveditorserver.vercel.app",
};

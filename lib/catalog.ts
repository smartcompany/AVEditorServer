export type TextStyleStroke = {
  widthFactor: number;
  useAccent?: boolean;
  color?: number;
};

export type TextStyleGlow = {
  blurFactor: number;
  widthFactor?: number;
  useAccent?: boolean;
  color?: number;
  opacity?: number;
};

export type TextStyleShadow = {
  dxFactor: number;
  dyFactor: number;
  blurFactor?: number;
  useAccent?: boolean;
  color?: number;
  opacity?: number;
};

export type TextStyleLineShape = "capsule" | "brush";

export type TextStyleLineBackground = {
  useAccent?: boolean;
  color?: number;
  opacity?: number;
  padHFactor?: number;
  padVFactor?: number;
  radiusFactor?: number;
  shape?: TextStyleLineShape;
  shadowOpacity?: number;
  shadowBlurFactor?: number;
};

export type TextStyleFillGradient = {
  /** Left → right ARGB stops. */
  colors: number[];
};

export type TextStyleTemplate = {
  id: string;
  label: string;
  fillUseAccent?: boolean;
  fillColor?: number;
  fillContrastOnAccent?: boolean;
  fillGradient?: TextStyleFillGradient;
  strokes?: TextStyleStroke[];
  glow?: TextStyleGlow;
  shadow?: TextStyleShadow;
  lineBackground?: TextStyleLineBackground;
  /** Flutter OverlayFonts id applied when the user picks this pack. */
  preferredFontId?: string;
};

export type TextEntranceAnimation = {
  id: "typewriter" | "fade" | "slide_up";
  durationMs?: number;
};

/**
 * Pack kinds:
 * - effect: static CapCut-style text look (no motion)
 * - template: effect + entrance animation
 */
export type TextTemplatePackKind = "effect" | "template";

export type TextTemplatePackItem = {
  id: string;
  title: string;
  kind?: TextTemplatePackKind;
  premium?: boolean;
  /** Relative to site origin, e.g. text_packs/lottie/hearts.json */
  lottieUrl?: string;
  previewUrl?: string;
  downloadSizeBytes?: number;
  style: TextStyleTemplate;
  /** Entrance motion; omit for static text effects. */
  animation?: TextEntranceAnimation;
};

export type TextTemplatePackCategory = {
  id: string;
  title: string;
  items: TextTemplatePackItem[];
};

export type TextTemplatePackCatalog = {
  version: number;
  /** Absolute base URL Flutter should resolve relative lottieUrl against. */
  baseUrl: string;
  categories: TextTemplatePackCategory[];
};

/**
 * Effects + templates served to the Flutter client.
 * - effects: static CapCut-style looks
 * - templates: look + entrance animation (Journal / Neon / Sticker)
 */
export const PACK_CATEGORIES: TextTemplatePackCategory[] = [
  {
    id: "effects",
    title: "Effects",
    items: [
      {
        id: "effect_pop_green",
        title: "Pop",
        kind: "effect",
        premium: false,
        downloadSizeBytes: 0,
        style: {
          id: "effect_pop_green",
          label: "Pop",
          fillColor: 4286381930, // 0xFF7CFF6A
          fillUseAccent: false,
          preferredFontId: "blackHanSans",
          strokes: [
            // Thick cream outer
            { widthFactor: 0.3, useAccent: false, color: 4294305464 }, // 0xFFF5E6B8
            // Dark green inner
            { widthFactor: 0.14, useAccent: false, color: 4279917600 }, // 0xFF1A5C20
          ],
          shadow: {
            dxFactor: 0.04,
            dyFactor: 0.06,
            blurFactor: 0,
            useAccent: false,
            color: 4278190080,
            opacity: 0.55,
          },
        },
      },
      {
        id: "effect_pastel",
        title: "Pastel",
        kind: "effect",
        premium: false,
        downloadSizeBytes: 0,
        style: {
          id: "effect_pastel",
          label: "Pastel",
          fillColor: 4294287552, // fallback pink
          fillUseAccent: false,
          preferredFontId: "gothicA1",
          fillGradient: {
            colors: [
              4294301550, // yellow 0xFFF5D76E
              4294287552, // pink 0xFFF5A0C0
              4291408117, // lavender 0xFFC9B0F5
            ],
          },
        },
      },
      {
        id: "effect_torn_label",
        title: "Torn",
        kind: "effect",
        premium: false,
        downloadSizeBytes: 0,
        style: {
          id: "effect_torn_label",
          label: "Torn",
          fillColor: 4279308561, // 0xFF111111
          fillUseAccent: false,
          preferredFontId: "blackHanSans",
          lineBackground: {
            useAccent: false,
            color: 4294967295, // white
            opacity: 1,
            padHFactor: 0.4,
            padVFactor: 0.3,
            radiusFactor: 0.2,
            shape: "brush",
            shadowOpacity: 0.4,
            shadowBlurFactor: 0.2,
          },
        },
      },
    ],
  },
  {
    id: "templates",
    title: "Templates",
    items: [
      {
        id: "pack_journal",
        title: "Journal",
        kind: "template",
        premium: false,
        downloadSizeBytes: 0,
        animation: { id: "typewriter", durationMs: 900 },
        style: {
          id: "pack_journal",
          label: "Journal",
          fillColor: 4280948752, // 0xFF2A1810
          fillUseAccent: false,
          preferredFontId: "gaegu",
          lineBackground: {
            useAccent: false,
            color: 4294108364, // 0xFFF2E4CC
            opacity: 1,
            padHFactor: 0.42,
            padVFactor: 0.32,
            radiusFactor: 0.35,
            shape: "brush",
            shadowOpacity: 0.55,
            shadowBlurFactor: 0.28,
          },
        },
      },
      {
        id: "pack_neon_pulse",
        title: "Neon",
        kind: "template",
        premium: false,
        downloadSizeBytes: 0,
        animation: { id: "fade", durationMs: 800 },
        style: {
          id: "pack_neon_pulse",
          label: "Neon",
          fillColor: 4294967295, // 0xFFFFFFFF
          fillUseAccent: false,
          preferredFontId: "blackHanSans",
          strokes: [
            { widthFactor: 0.18, useAccent: true },
            { widthFactor: 0.08, useAccent: false, color: 4294967295 },
          ],
          glow: {
            blurFactor: 0.7,
            widthFactor: 0.28,
            useAccent: true,
            opacity: 0.95,
          },
          shadow: {
            dxFactor: 0,
            dyFactor: 0.02,
            blurFactor: 0.18,
            useAccent: false,
            color: 4278190080,
            opacity: 0.5,
          },
        },
      },
      {
        id: "pack_sticker",
        title: "Sticker",
        kind: "template",
        premium: false,
        downloadSizeBytes: 0,
        animation: { id: "slide_up", durationMs: 700 },
        style: {
          id: "pack_sticker",
          label: "Sticker",
          fillUseAccent: true,
          preferredFontId: "blackHanSans",
          strokes: [
            { widthFactor: 0.26, useAccent: false, color: 4294967295 },
            { widthFactor: 0.12, useAccent: false, color: 4279308561 }, // 0xFF111111
          ],
          shadow: {
            dxFactor: 0.07,
            dyFactor: 0.09,
            blurFactor: 0,
            useAccent: false,
            color: 4278190080,
            opacity: 0.85,
          },
        },
      },
    ],
  },
];

export function buildCatalog(baseUrl: string): TextTemplatePackCatalog {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return {
    version: 6,
    baseUrl: normalized,
    categories: PACK_CATEGORIES,
  };
}

export function originFromRequest(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto?.split(",")[0]?.trim() || "https";
    return `${proto}://${forwardedHost}`;
  }
  return url.origin;
}

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

export type TextStyleTemplate = {
  id: string;
  label: string;
  fillUseAccent?: boolean;
  fillColor?: number;
  fillContrastOnAccent?: boolean;
  strokes?: TextStyleStroke[];
  glow?: TextStyleGlow;
  shadow?: TextStyleShadow;
  lineBackground?: TextStyleLineBackground;
  /** Flutter OverlayFonts id applied when the user picks this pack. */
  preferredFontId?: string;
};

export type TextTemplatePackItem = {
  id: string;
  title: string;
  premium?: boolean;
  /** Relative to site origin, e.g. text_packs/lottie/hearts.json */
  lottieUrl?: string;
  previewUrl?: string;
  downloadSizeBytes?: number;
  style: TextStyleTemplate;
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
 * Pack definitions served to the AVEditor Flutter client.
 * Edit + redeploy the server to ship new templates — no app release required
 * as long as styles use paint features the client already supports.
 */
export const PACK_CATEGORIES: TextTemplatePackCategory[] = [
  {
    id: "popular",
    title: "Popular",
    items: [
      {
        id: "pack_journal",
        title: "Journal",
        premium: false,
        downloadSizeBytes: 0,
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
        premium: false,
        downloadSizeBytes: 0,
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
        premium: false,
        downloadSizeBytes: 0,
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
    version: 3,
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

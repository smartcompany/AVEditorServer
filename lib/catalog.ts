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

export type TextStyleLineBackground = {
  useAccent?: boolean;
  color?: number;
  opacity?: number;
  padHFactor?: number;
  padVFactor?: number;
  radiusFactor?: number;
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

/** Pack definitions served to the AVEditor Flutter client. */
export const PACK_CATEGORIES: TextTemplatePackCategory[] = [
  {
    id: "popular",
    title: "Popular",
    items: [
      {
        id: "pack_hearts",
        title: "Hearts",
        premium: false,
        lottieUrl: "text_packs/lottie/hearts.json",
        downloadSizeBytes: 2400,
        style: {
          id: "pack_hearts",
          label: "Hearts",
          fillUseAccent: true,
          strokes: [
            { widthFactor: 0.12, useAccent: false, color: 4294967295 },
          ],
          glow: {
            blurFactor: 0.4,
            widthFactor: 0.16,
            useAccent: true,
            opacity: 0.85,
          },
        },
      },
      {
        id: "pack_burst",
        title: "BAM",
        premium: false,
        lottieUrl: "text_packs/lottie/burst.json",
        downloadSizeBytes: 1800,
        style: {
          id: "pack_burst",
          label: "BAM",
          fillColor: 4294967040,
          fillUseAccent: false,
          strokes: [
            { widthFactor: 0.18, useAccent: false, color: 4278190080 },
          ],
          shadow: {
            dxFactor: 0.06,
            dyFactor: 0.08,
            blurFactor: 0,
            useAccent: false,
            color: 4278190080,
            opacity: 0.9,
          },
        },
      },
      {
        id: "pack_glow",
        title: "Spark",
        premium: false,
        lottieUrl: "text_packs/lottie/glow_spark.json",
        downloadSizeBytes: 2000,
        style: {
          id: "pack_glow",
          label: "Spark",
          fillUseAccent: true,
          glow: {
            blurFactor: 0.6,
            widthFactor: 0.22,
            useAccent: false,
            color: 4294967295,
            opacity: 0.9,
          },
          shadow: {
            dxFactor: 0,
            dyFactor: 0.02,
            blurFactor: 0.12,
            useAccent: false,
            color: 4278190080,
            opacity: 0.5,
          },
        },
      },
      {
        id: "pack_torn",
        title: "Torn",
        premium: false,
        downloadSizeBytes: 0,
        style: {
          id: "pack_torn",
          label: "Torn",
          fillContrastOnAccent: false,
          fillColor: 4278190080,
          fillUseAccent: false,
          lineBackground: {
            useAccent: false,
            color: 4294967295,
            opacity: 1,
            padHFactor: 0.35,
            padVFactor: 0.22,
            radiusFactor: 0.08,
          },
        },
      },
    ],
  },
  {
    id: "premium",
    title: "Premium",
    items: [
      {
        id: "pack_remote_neon",
        title: "Neon",
        premium: true,
        lottieUrl: "text_packs/lottie/glow_spark.json",
        downloadSizeBytes: 2000,
        style: {
          id: "pack_remote_neon",
          label: "Neon",
          fillUseAccent: true,
          strokes: [{ widthFactor: 0.14, useAccent: true }],
          glow: {
            blurFactor: 0.5,
            widthFactor: 0.2,
            useAccent: true,
            opacity: 0.95,
          },
        },
      },
    ],
  },
];

export function buildCatalog(baseUrl: string): TextTemplatePackCatalog {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return {
    version: 1,
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

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


// ---------------------------------------------------------------------------
// Catalog builders. Colors are ARGB (0xAARRGGBB); JSON serializes them as the
// same unsigned integers Flutter's Color(int) expects.
// Only primitives the Flutter preview *and* export raster draw identically:
// fill / gradient / strokes / glow / shadow / line background. No Lottie.
// ---------------------------------------------------------------------------

const WHITE = 0xffffffff;
const BLACK = 0xff000000;
const INK = 0xff111111;

function effect(id: string, title: string, style: Omit<TextStyleTemplate, "id" | "label">): TextTemplatePackItem {
  return {
    id,
    title,
    kind: "effect",
    premium: false,
    downloadSizeBytes: 0,
    style: { id, label: title, fillUseAccent: false, ...style },
  };
}

function template(
  id: string,
  title: string,
  animation: TextEntranceAnimation,
  style: Omit<TextStyleTemplate, "id" | "label">,
): TextTemplatePackItem {
  return {
    id,
    title,
    kind: "template",
    premium: false,
    downloadSizeBytes: 0,
    animation,
    style: { id, label: title, fillUseAccent: false, ...style },
  };
}

const hardShadow = (color: number, dx = 0.06, dy = 0.08, opacity = 0.9): TextStyleShadow => ({
  dxFactor: dx,
  dyFactor: dy,
  blurFactor: 0,
  useAccent: false,
  color,
  opacity,
});

const softShadow = (opacity = 0.6, blur = 0.3): TextStyleShadow => ({
  dxFactor: 0,
  dyFactor: 0.05,
  blurFactor: blur,
  useAccent: false,
  color: BLACK,
  opacity,
});

const capsule = (color: number, opacity = 1, radiusFactor = 0.18): TextStyleLineBackground => ({
  useAccent: false,
  color,
  opacity,
  padHFactor: 0.28,
  padVFactor: 0.16,
  radiusFactor,
  shape: "capsule",
});

const stroke = (widthFactor: number, color: number): TextStyleStroke => ({
  widthFactor,
  useAccent: false,
  color,
});

const glow = (color: number, blurFactor = 0.6, widthFactor = 0.24, opacity = 0.95): TextStyleGlow => ({
  blurFactor,
  widthFactor,
  useAccent: false,
  color,
  opacity,
});

// Shared looks so a template and its static effect stay in sync.
const LOOK = {
  outline: { fillColor: WHITE, preferredFontId: "blackHanSans", strokes: [stroke(0.16, INK)] },
  caption: { fillColor: WHITE, preferredFontId: "notoSansKr", lineBackground: capsule(BLACK, 0.62, 0.14) },
  highlight: { fillColor: INK, preferredFontId: "doHyeon", lineBackground: capsule(0xffffe14d, 1, 0.08) },
  news: { fillColor: WHITE, preferredFontId: "blackHanSans", lineBackground: capsule(0xffe53935, 1, 0.06) },
  neonPink: {
    fillColor: WHITE,
    preferredFontId: "blackHanSans",
    strokes: [stroke(0.1, 0xffff4fa3)],
    glow: glow(0xffff4fa3),
  },
  neonBlue: {
    fillColor: WHITE,
    preferredFontId: "blackHanSans",
    strokes: [stroke(0.1, 0xff35e0ff)],
    glow: glow(0xff35e0ff),
  },
  gold: {
    fillColor: 0xfff5c542,
    preferredFontId: "blackHanSans",
    fillGradient: { colors: [0xfffff3b0, 0xfff5c542, 0xffc8901e] },
    strokes: [stroke(0.08, 0xff5a3a0a)],
    shadow: softShadow(0.55, 0.2),
  },
  fire: {
    fillColor: 0xffff8a1f,
    preferredFontId: "blackHanSans",
    fillGradient: { colors: [0xffffe066, 0xffff8a1f, 0xffe8261c] },
    strokes: [stroke(0.1, 0xff5c0a00)],
    glow: glow(0xffff6a00, 0.5, 0.18, 0.7),
  },
  ice: {
    fillColor: 0xffbee9ff,
    preferredFontId: "blackHanSans",
    fillGradient: { colors: [WHITE, 0xffbee9ff, 0xff5ab8f0] },
    strokes: [stroke(0.08, 0xff1b4f7a)],
    glow: glow(0xffbfeaff, 0.5, 0.2, 0.8),
  },
  retro: {
    fillColor: 0xffffe14d,
    preferredFontId: "blackHanSans",
    strokes: [stroke(0.1, INK)],
    shadow: hardShadow(0xffe53935, 0.08, 0.1, 1),
  },
  comic: {
    fillColor: 0xffffe14d,
    preferredFontId: "doHyeon",
    strokes: [stroke(0.22, INK)],
    shadow: hardShadow(INK, 0.06, 0.08, 1),
  },
  candy: {
    fillColor: 0xffff4fa3,
    preferredFontId: "blackHanSans",
    strokes: [stroke(0.28, WHITE), stroke(0.12, 0xffb0126a)],
    shadow: softShadow(0.35, 0.2),
  },
  sunset: {
    fillColor: 0xffff9a3c,
    preferredFontId: "blackHanSans",
    fillGradient: { colors: [0xffff5fa2, 0xffff9a3c, 0xffffe066] },
    shadow: softShadow(0.5, 0.25),
  },
  ocean: {
    fillColor: 0xff2f8cff,
    preferredFontId: "blackHanSans",
    fillGradient: { colors: [0xff2ee6c9, 0xff2f8cff, 0xff4b3bd6] },
    strokes: [stroke(0.1, WHITE)],
  },
  softShadow: { fillColor: WHITE, preferredFontId: "notoSansKr", shadow: softShadow(0.75, 0.4) },
  glow: { fillColor: WHITE, preferredFontId: "notoSansKr", glow: glow(WHITE, 0.6, 0.2, 0.85) },
  colorPop: {
    fillUseAccent: true,
    preferredFontId: "blackHanSans",
    strokes: [stroke(0.22, WHITE), stroke(0.1, INK)],
  },
} satisfies Record<string, Omit<TextStyleTemplate, "id" | "label">>;

const MORE_EFFECTS: TextTemplatePackItem[] = [
  effect("effect_outline", "Outline", LOOK.outline),
  effect("effect_caption", "Caption", LOOK.caption),
  effect("effect_highlight", "Highlight", LOOK.highlight),
  effect("effect_news", "News", LOOK.news),
  effect("effect_neon_pink", "Neon Pink", LOOK.neonPink),
  effect("effect_neon_blue", "Neon Blue", LOOK.neonBlue),
  effect("effect_gold", "Gold", LOOK.gold),
  effect("effect_fire", "Fire", LOOK.fire),
  effect("effect_ice", "Ice", LOOK.ice),
  effect("effect_retro", "Retro", LOOK.retro),
  effect("effect_comic", "Comic", LOOK.comic),
  effect("effect_candy", "Candy", LOOK.candy),
  effect("effect_sunset", "Sunset", LOOK.sunset),
  effect("effect_ocean", "Ocean", LOOK.ocean),
  effect("effect_soft_shadow", "Soft Shadow", LOOK.softShadow),
  effect("effect_glow", "Glow", LOOK.glow),
  effect("effect_color_pop", "Color Pop", LOOK.colorPop),
];

const MORE_TEMPLATES: TextTemplatePackItem[] = [
  template("pack_subtitle", "Subtitle", { id: "fade", durationMs: 400 }, LOOK.caption),
  template("pack_typing", "Typing", { id: "typewriter", durationMs: 1000 }, {
    fillColor: WHITE,
    preferredFontId: "roboto",
    lineBackground: capsule(INK, 0.85, 0.1),
  }),
  template("pack_breaking", "Breaking", { id: "slide_up", durationMs: 500 }, LOOK.news),
  template("pack_marker", "Marker", { id: "typewriter", durationMs: 800 }, LOOK.highlight),
  template("pack_memo", "Memo", { id: "typewriter", durationMs: 900 }, {
    fillColor: 0xff3a2a10,
    preferredFontId: "gaegu",
    lineBackground: {
      useAccent: false,
      color: 0xffffe98a,
      opacity: 1,
      padHFactor: 0.42,
      padVFactor: 0.32,
      radiusFactor: 0.3,
      shape: "brush",
      shadowOpacity: 0.45,
      shadowBlurFactor: 0.25,
    },
  }),
  template("pack_neon_pink", "Neon Pink", { id: "fade", durationMs: 900 }, LOOK.neonPink),
  template("pack_cyber", "Cyber", { id: "typewriter", durationMs: 700 }, LOOK.neonBlue),
  template("pack_gold_title", "Gold Title", { id: "slide_up", durationMs: 800 }, LOOK.gold),
  template("pack_hot", "Hot", { id: "slide_up", durationMs: 600 }, LOOK.fire),
  template("pack_frost", "Frost", { id: "fade", durationMs: 1000 }, LOOK.ice),
  template("pack_retro", "Retro", { id: "slide_up", durationMs: 600 }, LOOK.retro),
  template("pack_comic", "Comic", { id: "typewriter", durationMs: 600 }, LOOK.comic),
  template("pack_candy", "Candy", { id: "slide_up", durationMs: 500 }, LOOK.candy),
  template("pack_sunset", "Sunset", { id: "fade", durationMs: 1000 }, LOOK.sunset),
  template("pack_vlog", "Vlog", { id: "fade", durationMs: 700 }, {
    fillColor: WHITE,
    preferredFontId: "gothicA1",
    shadow: softShadow(0.7, 0.35),
  }),
  template("pack_quote", "Quote", { id: "typewriter", durationMs: 1200 }, {
    fillColor: WHITE,
    preferredFontId: "gaegu",
    shadow: softShadow(0.8, 0.3),
  }),
  template("pack_label", "Label", { id: "slide_up", durationMs: 500 }, {
    fillColor: INK,
    preferredFontId: "doHyeon",
    lineBackground: capsule(WHITE, 1, 0.12),
  }),
];

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
      ...MORE_EFFECTS,
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
      ...MORE_TEMPLATES,
    ],
  },
];

export function buildCatalog(baseUrl: string): TextTemplatePackCatalog {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return {
    version: 7,
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

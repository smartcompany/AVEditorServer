export type {
  TextCompAlign,
  TextCompDecoration,
  TextCompDecorationKind,
  TextCompSlot,
  TextComposition,
} from "./text-composition";
export {
  compositionEntriesFor,
  compositionPaintedSlotCount,
  compositionSampleText,
  splitTextToSlots,
} from "./text-composition";
export type { TextCompEntry } from "./text-composition";
import type { TextComposition } from "./text-composition";
import { compositionSampleText } from "./text-composition";
import { CAPCUT_TEXT_TEMPLATES } from "./capcut-text-templates";

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
  /** Bundled underlay (`text_packs/journal/paper_a.png`). */
  underlayAsset?: string;
  /** Remote underlay URL (absolute or site-relative). */
  underlayUrl?: string;
  /** Cycle per line for less repetition. */
  underlayVariants?: string[];
  grainAsset?: string;
  /** Normalized nine-slice `{l,t,r,b}` 0…1 of source. */
  nineSlice?: { l?: number; t?: number; r?: number; b?: number };
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

export type TextEntranceAnimationId =
  | "typewriter"
  | "fade"
  | "slide_up"
  | "crawl"
  | "pop"
  | "kinetic"
  | "focus"
  | "staged"
  | "impact"
  | "glitch"
  | "neon";

export type TextEntranceAnimation = {
  id: TextEntranceAnimationId;
  /** Entrance length, or recommended overlay span for continuous crawl. */
  durationMs?: number;
  /** Typewriter / kinetic — neighbouring glyph window overlap (0…0.95). */
  staggerOverlap?: number;
  /** Typewriter — `glyph` | `line` | `auto`. */
  staggerBy?: "glyph" | "line" | "auto";
  /** Crawl tilt degrees. */
  tiltDeg?: number;
  perspective?: number;
  scrollStartFactor?: number;
  scrollEndFactor?: number;
  /** Pop / impact overshoot past 1.0. */
  bounce?: number;
  /** Shake amplitude as × fontSize. */
  shake?: number;
  /** Starting scale for pop / focus. */
  scaleFrom?: number;
  /** Focus starting blur as × fontSize. */
  blurFrom?: number;
  /** Typewriter caret. */
  cursor?: boolean;
  cursorBlinkHz?: number;
  /** Kinetic per-glyph scale / rotation. */
  kineticAmp?: number;
  kineticRotDeg?: number;
  /** Staged slot sequencing (0…1). */
  slotStagger?: number;
  /** Glitch RGB / jitter as × fontSize. */
  glitchAmp?: number;
  /** Neon flicker strength 0…1. */
  neonFlicker?: number;
  /** Impact punch scale above 1.0. */
  punch?: number;
};

/** Defaults mirrored by the Flutter client when fields are omitted. */
export const TYPEWRITER_ANIMATION_DEFAULTS = {
  staggerOverlap: 0.55,
  staggerBy: "auto" as const,
  cursor: false,
  cursorBlinkHz: 2,
};

export const CRAWL_ANIMATION_DEFAULTS = {
  tiltDeg: 54,
  perspective: 0.0012,
  scrollStartFactor: 14,
  scrollEndFactor: -32,
} as const;

/** Flat end-credits scroll — same crawl engine, no 3D tilt. */
export const CREDITS_SCROLL_DEFAULTS = {
  tiltDeg: 0,
  perspective: 0.0012,
  scrollStartFactor: 12,
  scrollEndFactor: -28,
} as const;

export const POP_ANIMATION_DEFAULTS = {
  bounce: 0.18,
  shake: 0,
  scaleFrom: 0.25,
} as const;

export const KINETIC_ANIMATION_DEFAULTS = {
  staggerOverlap: 0.45,
  kineticAmp: 0.55,
  kineticRotDeg: 12,
} as const;

export const FOCUS_ANIMATION_DEFAULTS = {
  scaleFrom: 0.85,
  blurFrom: 0.35,
} as const;

export const STAGED_ANIMATION_DEFAULTS = {
  slotStagger: 0.85,
} as const;

export const IMPACT_ANIMATION_DEFAULTS = {
  punch: 0.12,
  shake: 0.06,
  bounce: 0.1,
  scaleFrom: 0.7,
} as const;

export const GLITCH_ANIMATION_DEFAULTS = {
  glitchAmp: 0.08,
} as const;

export const NEON_ANIMATION_DEFAULTS = {
  neonFlicker: 0.35,
} as const;

export const ENTRANCE_ANIMATION_IDS: TextEntranceAnimationId[] = [
  "typewriter",
  "fade",
  "slide_up",
  "crawl",
  "pop",
  "kinetic",
  "focus",
  "staged",
  "impact",
  "glitch",
  "neon",
];

/**
 * Pack kinds:
 * - effect: static CapCut-style text look (no motion)
 * - template: effect + entrance animation
 */
export type TextTemplatePackKind = "effect" | "template";

/**
 * Line / block placement hints (spec §6). Renderers must not invent this from
 * animation.staggerBy — stagger controls timing; layout controls geometry.
 */
export type TextPackLayout = {
  /** One underlay / paper strip per line (Journal). false = single block. */
  perLine?: boolean;
  /** Extra gap between lines as a multiple of fontSize. */
  lineGapFactor?: number;
  /** Soft clamp; product prefers scale-down when exceeded. */
  maxLines?: number;
  /** Overlay-box alignment for the text block. */
  align?: "start" | "center" | "end";
};

export type TextTemplatePackItem = {
  id: string;
  title: string;
  kind?: TextTemplatePackKind;
  /** free | plus | pro — effects never cost credits. */
  accessTier?: "free" | "plus" | "pro";
  /** Legacy mirror: true when accessTier is plus or pro. */
  premium?: boolean;
  /** Relative to site origin, e.g. text_packs/lottie/hearts.json */
  lottieUrl?: string;
  previewUrl?: string;
  downloadSizeBytes?: number;
  style: TextStyleTemplate;
  /** Entrance motion; omit for static text effects. */
  animation?: TextEntranceAnimation;
  /**
   * Line geometry (per-line strips, gap, align). Server-driven — app and
   * dashboard must both read this instead of hardcoding Journal behaviour.
   */
  layout?: TextPackLayout;
  /** Optional body text applied when the user picks this pack. */
  sampleText?: string;
  /**
   * CapCut-like multi-slot layout + vector decorations.
   * When set, app/dashboard paint composition instead of a single styled string.
   */
  composition?: TextComposition;
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

/** Default tile / apply sample for static text effects. */
export const DEFAULT_EFFECT_SAMPLE_TEXT = "Aa";
/** Default tile / apply sample for text templates (multi-line). */
export const DEFAULT_TEMPLATE_SAMPLE_TEXT = "Hello\nWorld";


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
    sampleText: DEFAULT_EFFECT_SAMPLE_TEXT,
  };
}

function template(
  id: string,
  title: string,
  animation: TextEntranceAnimation,
  style: Omit<TextStyleTemplate, "id" | "label">,
  extras?: { sampleText?: string },
): TextTemplatePackItem {
  const anim: TextEntranceAnimation =
    animation.id === "typewriter"
      ? {
          ...TYPEWRITER_ANIMATION_DEFAULTS,
          ...animation,
        }
      : animation;
  return {
    id,
    title,
    kind: "template",
    premium: false,
    downloadSizeBytes: 0,
    animation: anim,
    style: { id, label: title, fillUseAccent: false, ...style },
    sampleText: extras?.sampleText?.trim() || DEFAULT_TEMPLATE_SAMPLE_TEXT,
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
  crawl: {
    fillColor: 0xffffe81f,
    preferredFontId: "blackHanSans",
    strokes: [stroke(0.06, 0xff5a4000)],
    shadow: softShadow(0.45, 0.15),
  },
  /** Flat white credits on black (pair with tiltDeg: 0 crawl). */
  credits: {
    fillColor: WHITE,
    preferredFontId: "notoSansKr",
    shadow: softShadow(0.55, 0.2),
  },
} satisfies Record<string, Omit<TextStyleTemplate, "id" | "label">>;

/** Shared placeholder for crawl / credits scroll templates. */
const SCROLL_SAMPLE = `Hello

I am making a short film.
This is where the story begins.

Thank you for watching.
See you next time.`;

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

/** Kept crawl templates + CapCut 30 (see capcut-text-templates.ts). */
const KEEP_CRAWL_TEMPLATES: TextTemplatePackItem[] = [
  template(
    "tpl_star_wars_crawl",
    "Star Crawl",
    {
      id: "crawl",
      durationMs: 18000,
      ...CRAWL_ANIMATION_DEFAULTS,
    },
    LOOK.crawl,
    { sampleText: SCROLL_SAMPLE },
  ),
  template(
    "tpl_credits_scroll",
    "Credits Scroll",
    {
      id: "crawl",
      durationMs: 16000,
      ...CREDITS_SCROLL_DEFAULTS,
    },
    LOOK.credits,
    { sampleText: SCROLL_SAMPLE },
  ),
];

const MORE_TEMPLATES: TextTemplatePackItem[] = [
  ...KEEP_CRAWL_TEMPLATES,
  ...CAPCUT_TEXT_TEMPLATES,
];

/**
 * Effects + templates served to the Flutter client.
 * - effects: static CapCut-style looks
 * - templates: Journal / crawls / CapCut 30
 */
/**
 * Text look access tiers. Credits are AI-only — these never cost credits.
 * Plus unlocks Plus; Pro/Studio unlock Plus + Pro.
 */
export const PLUS_PACK_ITEM_IDS = new Set<string>([
  "effect_glow",
  "effect_color_pop",
  "effect_candy",
  // Formerly Pro — Plus-only catalog until Pro is sold.
  "effect_neon_pink",
  "effect_neon_blue",
  "effect_gold",
  "effect_fire",
  "effect_ice",
  "tpl_glitch",
  "tpl_neon",
  "tpl_kinetic",
]);

export const PRO_PACK_ITEM_IDS = new Set<string>([]);

/** @deprecated Prefer PLUS_ / PRO_PACK_ITEM_IDS. */
export const PREMIUM_PACK_ITEM_IDS = new Set<string>([
  ...PLUS_PACK_ITEM_IDS,
  ...PRO_PACK_ITEM_IDS,
]);

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
        layout: { perLine: true, lineGapFactor: 0.12, align: "center" },
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
        animation: {
          id: "typewriter",
          durationMs: 900,
          staggerBy: "line",
        },
        // Geometry (not timing): keep every line slot from t=0 — matches app.
        layout: { perLine: true, lineGapFactor: 0.12, align: "center" },
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
            padHFactor: 0.48,
            padVFactor: 0.38,
            radiusFactor: 0.35,
            shape: "brush",
            shadowOpacity: 0.45,
            shadowBlurFactor: 0.22,
            underlayAsset: "text_packs/journal/paper_a.png",
            underlayUrl: "text_packs/journal/paper_a.png",
            underlayVariants: [
              "text_packs/journal/paper_a.png",
              "text_packs/journal/paper_b.png",
            ],
            grainAsset: "text_packs/journal/grain.png",
            nineSlice: { l: 0.2, t: 0.26, r: 0.2, b: 0.26 },
          },
        },
      },
      ...MORE_TEMPLATES,
    ],
  },
];

for (const category of PACK_CATEGORIES) {
  for (const item of category.items) {
    const accessTier = PRO_PACK_ITEM_IDS.has(item.id)
      ? "pro"
      : PLUS_PACK_ITEM_IDS.has(item.id)
        ? "plus"
        : "free";
    item.accessTier = accessTier;
    item.premium = accessTier !== "free";
  }
}

/** Seed (code) catalog version. Bump when the seed itself changes. */
export const TEXT_CATALOG_SEED_VERSION = 17;

function withDefaultSampleText(item: TextTemplatePackItem): TextTemplatePackItem {
  if (item.sampleText?.trim()) return item;
  if (item.composition?.slots?.length) {
    return { ...item, sampleText: compositionSampleText(item.composition) };
  }
  return {
    ...item,
    sampleText:
      item.kind === "template"
        ? DEFAULT_TEMPLATE_SAMPLE_TEXT
        : DEFAULT_EFFECT_SAMPLE_TEXT,
  };
}

function withDefaultAnimationParams(
  item: TextTemplatePackItem,
): TextTemplatePackItem {
  const animation = item.animation;
  if (!animation) return item;
  const defaults: Record<string, Record<string, unknown>> = {
    typewriter: TYPEWRITER_ANIMATION_DEFAULTS,
    crawl: CRAWL_ANIMATION_DEFAULTS,
    pop: POP_ANIMATION_DEFAULTS,
    kinetic: KINETIC_ANIMATION_DEFAULTS,
    focus: FOCUS_ANIMATION_DEFAULTS,
    staged: STAGED_ANIMATION_DEFAULTS,
    impact: IMPACT_ANIMATION_DEFAULTS,
    glitch: GLITCH_ANIMATION_DEFAULTS,
    neon: NEON_ANIMATION_DEFAULTS,
  };
  const base = defaults[animation.id];
  if (!base) return item;
  return {
    ...item,
    animation: { ...base, ...animation },
  };
}

export function buildCatalog(baseUrl: string): TextTemplatePackCatalog {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return {
    version: TEXT_CATALOG_SEED_VERSION,
    baseUrl: normalized,
    categories: PACK_CATEGORIES.map((category) => ({
      ...category,
      items: category.items.map((item) =>
        withDefaultAnimationParams(withDefaultSampleText(item)),
      ),
    })),
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

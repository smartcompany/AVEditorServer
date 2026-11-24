export type {
  TextCompAlign,
  TextCompDecoration,
  TextCompDecorationKind,
  TextCompSlot,
  TextComposition,
} from "./text-composition";
export {
  compositionSampleText,
  splitTextToSlots,
} from "./text-composition";
import type { TextComposition } from "./text-composition";
import { compositionSampleText } from "./text-composition";

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

export type TextEntranceAnimation = {
  id: "typewriter" | "fade" | "slide_up" | "crawl";
  /** Entrance length, or recommended overlay span for continuous crawl. */
  durationMs?: number;
  /**
   * Typewriter only — how much neighbouring glyph windows overlap (0 = one
   * after another, higher = more concurrent). Default 0.55.
   */
  staggerOverlap?: number;
  /**
   * Typewriter only — `glyph` staggers every character; `line` finishes each
   * line before the next (Hello… then World…). `auto` uses `line` when the
   * sample has a newline. Default `auto`.
   */
  staggerBy?: "glyph" | "line" | "auto";
  /**
   * Crawl only — degrees of classic “bottom nearer / top into distance” tilt.
   * Flutter applies the platform sign; dashboard CSS uses this value as-is.
   * Default 54.
   */
  tiltDeg?: number;
  /** Crawl only — Matrix4 / CSS perspective strength. Default 0.0012. */
  perspective?: number;
  /** Crawl only — start translateY as × fontSize (positive = below). Default 14. */
  scrollStartFactor?: number;
  /** Crawl only — end translateY as × fontSize (negative = above). Default -32. */
  scrollEndFactor?: number;
};

/** Defaults mirrored by the Flutter client when fields are omitted. */
export const TYPEWRITER_ANIMATION_DEFAULTS = {
  staggerOverlap: 0.55,
  staggerBy: "auto" as const,
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

/** CapCut basic text-template benchmarks (composition = slots + decorations). */
const CAPCUT_BASIC_TEMPLATES: TextTemplatePackItem[] = [
  {
    id: "tpl_daily_vlog",
    title: "Daily Vlog",
    kind: "template",
    downloadSizeBytes: 0,
    animation: { id: "fade", durationMs: 700 },
    style: {
      id: "tpl_daily_vlog",
      label: "Daily Vlog",
      fillColor: WHITE,
      fillUseAccent: false,
      preferredFontId: "gothicA1",
    },
    composition: {
      align: "center",
      gapFactor: 0.18,
      slots: [
        {
          id: "eyebrow",
          role: "eyebrow",
          defaultText: "BY EASYCLIP",
          fontSizeFactor: 0.32,
          fontWeight: 600,
          letterSpacingEm: 0.18,
          fillColor: WHITE,
        },
        {
          id: "title",
          role: "title",
          defaultText: "Daily Vlog",
          fontSizeFactor: 1.05,
          fontWeight: 800,
          fillColor: WHITE,
          preferredFontId: "doHyeon",
        },
      ],
      decorations: [
        {
          id: "slash",
          kind: "slash",
          color: WHITE,
          slotId: "title",
          attach: "below",
          thicknessFactor: 0.045,
          lengthFactor: 0.55,
          gapFactor: 0.2,
        },
      ],
    },
  },
  {
    id: "tpl_back",
    title: "Back",
    kind: "template",
    downloadSizeBytes: 0,
    animation: { id: "slide_up", durationMs: 650 },
    style: {
      id: "tpl_back",
      label: "Back",
      fillColor: WHITE,
      fillUseAccent: false,
      preferredFontId: "blackHanSans",
      strokes: [
        { widthFactor: 0.1, useAccent: false, color: BLACK },
      ],
    },
    composition: {
      align: "center",
      gapFactor: 0.35,
      slots: [
        {
          id: "title",
          role: "title",
          defaultText: "BACK",
          fontSizeFactor: 1.35,
          fontWeight: 900,
          letterSpacingEm: 0.06,
          fillColor: WHITE,
          preferredFontId: "blackHanSans",
        },
      ],
      decorations: [
        {
          id: "arrow",
          kind: "chevron_down",
          color: 0xffb0b0b0,
          slotId: "title",
          attach: "above",
          widthFactor: 0.9,
          heightFactor: 0.55,
          gapFactor: 0.15,
        },
      ],
    },
  },
  {
    id: "tpl_trending_now",
    title: "Trending Now",
    kind: "template",
    downloadSizeBytes: 0,
    animation: { id: "slide_up", durationMs: 550 },
    style: {
      id: "tpl_trending_now",
      label: "Trending Now",
      fillColor: WHITE,
      fillUseAccent: false,
      preferredFontId: "blackHanSans",
    },
    composition: {
      align: "start",
      gapFactor: 0.08,
      slots: [
        {
          id: "line1",
          role: "title",
          defaultText: "TRENDING",
          fontSizeFactor: 0.95,
          fontWeight: 900,
          fillColor: WHITE,
          align: "start",
        },
        {
          id: "line2",
          role: "title",
          defaultText: "NOW",
          fontSizeFactor: 0.95,
          fontWeight: 900,
          fillColor: WHITE,
          align: "start",
        },
      ],
      decorations: [
        {
          id: "accent",
          kind: "bar_v",
          color: 0xff2dd4bf,
          attach: "left",
          thicknessFactor: 0.22,
          lengthFactor: 1,
          gapFactor: 0.28,
        },
        {
          id: "underline",
          kind: "rule",
          color: WHITE,
          slotId: "line2",
          attach: "below",
          thicknessFactor: 0.04,
          lengthFactor: 1,
          gapFactor: 0.12,
        },
      ],
    },
  },
  {
    id: "tpl_bold_brave",
    title: "Bold Brave",
    kind: "template",
    downloadSizeBytes: 0,
    animation: { id: "typewriter", durationMs: 1100, staggerBy: "line" },
    style: {
      id: "tpl_bold_brave",
      label: "Bold Brave",
      fillColor: WHITE,
      fillUseAccent: false,
      preferredFontId: "notoSansKr",
    },
    composition: {
      align: "start",
      gapFactor: 0.12,
      slots: [
        {
          id: "a",
          role: "body",
          defaultText: "Bold.",
          fontSizeFactor: 0.85,
          fontWeight: 600,
          fillColor: WHITE,
          align: "start",
        },
        {
          id: "b",
          role: "body",
          defaultText: "Brave.",
          fontSizeFactor: 0.85,
          fontWeight: 500,
          italic: true,
          fillColor: WHITE,
          align: "start",
          dxFactor: 0.55,
        },
        {
          id: "c",
          role: "body",
          defaultText: "Beautiful.",
          fontSizeFactor: 0.9,
          fontWeight: 700,
          fillColor: WHITE,
          align: "start",
        },
      ],
    },
  },
  {
    id: "tpl_title_simple",
    title: "Title Simple",
    kind: "template",
    downloadSizeBytes: 0,
    animation: { id: "fade", durationMs: 600 },
    style: {
      id: "tpl_title_simple",
      label: "Title Simple",
      fillColor: WHITE,
      fillUseAccent: false,
      preferredFontId: "gothicA1",
    },
    composition: {
      align: "start",
      gapFactor: 0.22,
      slots: [
        {
          id: "title",
          role: "title",
          defaultText: "TITLE SIMPLE",
          fontSizeFactor: 0.9,
          fontWeight: 800,
          fillColor: WHITE,
          align: "start",
        },
        {
          id: "subtitle",
          role: "subtitle",
          defaultText: "sub heading",
          fontSizeFactor: 0.42,
          fontWeight: 500,
          fillColor: INK,
          align: "start",
          boxFillColor: WHITE,
          boxPadHFactor: 0.35,
          boxPadVFactor: 0.28,
        },
      ],
      decorations: [
        {
          id: "orange",
          kind: "bar_v",
          color: 0xffff8a00,
          attach: "right",
          thicknessFactor: 0.2,
          lengthFactor: 1,
          gapFactor: 0.3,
        },
      ],
    },
  },
  {
    id: "tpl_archive_july",
    title: "Archive",
    kind: "template",
    downloadSizeBytes: 0,
    animation: { id: "fade", durationMs: 800 },
    style: {
      id: "tpl_archive_july",
      label: "Archive",
      fillColor: WHITE,
      fillUseAccent: false,
      preferredFontId: "blackHanSans",
    },
    composition: {
      align: "center",
      gapFactor: 0.2,
      slots: [
        {
          id: "title",
          role: "title",
          defaultText: "ARCHIVE OF JULY",
          fontSizeFactor: 0.78,
          fontWeight: 900,
          fillColor: WHITE,
          preferredFontId: "blackHanSans",
        },
        {
          id: "subtitle",
          role: "subtitle",
          defaultText: "short memory",
          fontSizeFactor: 0.38,
          fontWeight: 400,
          italic: true,
          letterSpacingEm: 0.12,
          fillColor: WHITE,
          preferredFontId: "gaegu",
        },
      ],
      decorations: [
        {
          id: "divider",
          kind: "rule",
          color: WHITE,
          slotId: "title",
          attach: "below",
          thicknessFactor: 0.035,
          lengthFactor: 0.85,
          gapFactor: 0.18,
        },
      ],
    },
  },
];

const MORE_TEMPLATES: TextTemplatePackItem[] = [
  ...CAPCUT_BASIC_TEMPLATES,
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

/**
 * Effects + templates served to the Flutter client.
 * - effects: static CapCut-style looks
 * - templates: look + entrance animation (Journal / Neon / Sticker)
 */
/**
 * Text look access tiers. Credits are AI-only — these never cost credits.
 * Plus unlocks Plus; Pro/Studio unlock Plus + Pro.
 */
export const PLUS_PACK_ITEM_IDS = new Set<string>([
  "effect_glow",
  "effect_color_pop",
  "effect_candy",
  "pack_hot",
  "pack_candy",
  "pack_sunset",
  "pack_breaking",
  // Formerly Pro — Plus-only catalog until Pro is sold.
  "effect_neon_pink",
  "effect_neon_blue",
  "effect_gold",
  "effect_fire",
  "effect_ice",
  "pack_neon_pink",
  "pack_cyber",
  "pack_gold_title",
  "pack_frost",
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
export const TEXT_CATALOG_SEED_VERSION = 13;

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
  if (animation.id === "typewriter") {
    return {
      ...item,
      animation: { ...TYPEWRITER_ANIMATION_DEFAULTS, ...animation },
    };
  }
  if (animation.id === "crawl") {
    return {
      ...item,
      animation: { ...CRAWL_ANIMATION_DEFAULTS, ...animation },
    };
  }
  return item;
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

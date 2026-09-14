import { corsHeaders } from "@/lib/music";

export type TransitionRenderer =
  | "cut"
  | "xfade"
  | "primitive"
  | "shader"
  | "custom"
  | "asset";

export type TransitionLayerDto = {
  property:
    | "opacity"
    | "scale"
    | "translateX"
    | "translateY"
    | "rotation"
    | "blur"
    | "brightness"
    | "saturation"
    | "contrast";
  from: number;
  to: number;
  easing?: string;
  target?: "outgoing" | "incoming" | "both";
  bezier?: number[];
  /** Normalized progress window [0,1]. Defaults to full span. */
  start?: number;
  end?: number;
  /**
   * When set, endpoints are scaled toward the property identity by
   * `parameters[param]` (e.g. intensity). Authors write values at param=1.
   */
  param?: string;
};

export type TransitionParameterDto = {
  type: string;
  default: number;
  min?: number;
  max?: number;
};

export type TransitionControlDto = {
  type: string;
  key: string;
  label: string;
  min?: number;
  max?: number;
  default?: number;
};

/** App language codes; clients pick `titles[locale]` with `en` fallback. */
export type TransitionLocale = "en" | "ko" | "ja" | "zh";

export type LocalizedTitles = Record<TransitionLocale, string>;

export type TransitionItemDto = {
  id: string;
  version: number;
  /** Default display title (English). Prefer [titles] for localization. */
  title: string;
  name?: string;
  /** Server-owned localized labels. */
  titles: LocalizedTitles;
  category: string;
  renderer: TransitionRenderer;
  /** Legacy mirror for older clients. */
  effectType?: "cut" | "xfade" | "asset";
  ffmpegName: string;
  defaultDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  accent: string;
  premium?: boolean;
  thumbnailUrl?: string;
  previewUrl?: string;
  assetUrl?: string;
  shader?: string;
  customId?: string;
  /**
   * Server-driven effect DSL consumed by the client Transition Engine.
   * Example (ripple):
   * `{ type: "distortion", shape: "radial", source: "wave", wave: {...}, center: [0.5,0.5] }`
   */
  effect?: Record<string, unknown>;
  downloadSizeBytes?: number;
  itemVersion?: number;
  layers?: TransitionLayerDto[];
  parameters?: Record<string, TransitionParameterDto>;
  controls?: TransitionControlDto[];
};

export type TransitionCategoryDto = {
  id: string;
  title: string;
  titles: LocalizedTitles;
  items: TransitionItemDto[];
};

export type TransitionCatalogDto = {
  version: number;
  baseUrl: string;
  categories: TransitionCategoryDto[];
  items: TransitionItemDto[];
};

type XfadeOpts = {
  category?: string;
  defaultDurationMs?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  premium?: boolean;
  layers?: TransitionLayerDto[];
  parameters?: Record<string, TransitionParameterDto>;
  controls?: TransitionControlDto[];
  /** When set, renderer becomes primitive but still exports via ffmpegName. */
  renderer?: TransitionRenderer;
  /** Client special-case compositor id (e.g. doorway). */
  customId?: string;
  /** Server-driven effect DSL (distortion / wave / …). */
  effect?: Record<string, unknown>;
  version?: number;
};

/** Catalog source of truth — clients must read `defaultDurationMs` from items. */
export const DEFAULT_TRANSITION_DURATION_MS = 700;

function xfade(
  id: string,
  titles: LocalizedTitles,
  accent: string,
  ffmpegName: string,
  opts: XfadeOpts = {},
): TransitionItemDto {
  const renderer = opts.renderer ?? "xfade";
  const version = opts.version ?? 1;
  const title = titles.en;
  return {
    id,
    version,
    itemVersion: version,
    title,
    name: title,
    titles,
    category: opts.category ?? "basic",
    renderer,
    effectType: renderer === "cut" ? "cut" : "xfade",
    ffmpegName,
    defaultDurationMs: opts.defaultDurationMs ?? DEFAULT_TRANSITION_DURATION_MS,
    minDurationMs: opts.minDurationMs ?? 100,
    maxDurationMs: opts.maxDurationMs ?? 3000,
    accent,
    premium: opts.premium ?? false,
    thumbnailUrl: `transitions/thumbs/${id}.webp`,
    layers: opts.layers,
    parameters: opts.parameters,
    controls: opts.controls,
    customId: opts.customId,
    effect: opts.effect,
  };
}

/** iMovie-style display names — source of truth for all locales. */
const TITLES = {
  dissolve: {
    en: "Cross Dissolve",
    ko: "교차 디졸브",
    ja: "クロスディゾルブ",
    zh: "交叉溶解",
  },
  crossblur: {
    en: "Cross Blur",
    ko: "교차 흐림",
    ja: "クロスブラー",
    zh: "交叉模糊",
  },
  fadeblack: {
    en: "Fade to Black",
    ko: "검정색으로 페이드",
    ja: "ブラックにフェード",
    zh: "淡出到黑色",
  },
  fadewhite: {
    en: "Fade to White",
    ko: "흰색으로 페이드",
    ja: "ホワイトにフェード",
    zh: "淡出到白色",
  },
  spinin: {
    en: "Spin In",
    ko: "안으로 회전",
    ja: "スピンイン",
    zh: "旋入",
  },
  spinout: {
    en: "Spin Out",
    ko: "밖으로 회전",
    ja: "スピンアウト",
    zh: "旋出",
  },
  circleopen: {
    en: "Circle Open",
    ko: "열리는 원",
    ja: "サークルオープン",
    zh: "圆形打开",
  },
  circleclose: {
    en: "Circle Close",
    ko: "닫히는 원",
    ja: "サークルクローズ",
    zh: "圆形关闭",
  },
  doorway: {
    en: "Doorway",
    ko: "출입문",
    ja: "ドアウェイ",
    zh: "门",
  },
  swap: {
    en: "Swap",
    ko: "바꾸기",
    ja: "スワップ",
    zh: "交换",
  },
  cube: {
    en: "Cube",
    ko: "큐브",
    ja: "キューブ",
    zh: "立方体",
  },
  mosaic: {
    en: "Mosaic",
    ko: "모자이크",
    ja: "モザイク",
    zh: "马赛克",
  },
  wipeleft: {
    en: "Wipe Left",
    ko: "왼쪽으로 닦아내기",
    ja: "ワイプ左",
    zh: "向左擦除",
  },
  wiperight: {
    en: "Wipe Right",
    ko: "오른쪽으로 닦아내기",
    ja: "ワイプ右",
    zh: "向右擦除",
  },
  wipeup: {
    en: "Wipe Up",
    ko: "위로 닦아내기",
    ja: "ワイプ上",
    zh: "向上擦除",
  },
  wipedown: {
    en: "Wipe Down",
    ko: "아래로 닦아내기",
    ja: "ワイプ下",
    zh: "向下擦除",
  },
  slideleft: {
    en: "Slide Left",
    ko: "왼쪽으로 슬라이드",
    ja: "スライド左",
    zh: "向左滑动",
  },
  slideright: {
    en: "Slide Right",
    ko: "오른쪽으로 슬라이드",
    ja: "スライド右",
    zh: "向右滑动",
  },
  puzzleleft: {
    en: "Puzzle Left",
    ko: "왼쪽으로 퍼즐 효과",
    ja: "パズル左",
    zh: "向左拼图",
  },
  puzzleright: {
    en: "Puzzle Right",
    ko: "오른쪽으로 퍼즐 효과",
    ja: "パズル右",
    zh: "向右拼图",
  },
  crosszoom: {
    en: "Cross Zoom",
    ko: "교차 확대/축소",
    ja: "クロスズーム",
    zh: "交叉缩放",
  },
  ripple: {
    en: "Ripple",
    ko: "잔물결",
    ja: "リップル",
    zh: "波纹",
  },
} as const satisfies Record<string, LocalizedTitles>;

const CATEGORY_BASIC_TITLES: LocalizedTitles = {
  en: "Basic",
  ko: "기본형",
  ja: "基本",
  zh: "基本",
};

const intensityControl: TransitionControlDto = {
  type: "slider",
  key: "intensity",
  label: "Intensity",
  min: 0,
  max: 1,
  default: 0.7,
};

const intensityParam: Record<string, TransitionParameterDto> = {
  intensity: { type: "double", default: 0.7, min: 0, max: 1 },
};

const opacityCross: TransitionLayerDto[] = [
  {
    property: "opacity",
    from: 1,
    to: 0,
    easing: "easeInOut",
    target: "outgoing",
  },
  {
    property: "opacity",
    from: 0,
    to: 1,
    easing: "easeInOut",
    target: "incoming",
  },
];

function slideLayers(
  axis: "translateX" | "translateY",
  dir: 1 | -1,
): TransitionLayerDto[] {
  // Solid conveyor slide — both clips stay opaque (no crossfade ghosting).
  return [
    {
      property: axis,
      from: 0,
      to: -dir,
      easing: "easeInOut",
      target: "outgoing",
    },
    {
      property: axis,
      from: dir,
      to: 0,
      easing: "easeInOut",
      target: "incoming",
    },
    {
      property: "opacity",
      from: 1,
      to: 1,
      target: "outgoing",
    },
    {
      property: "opacity",
      from: 1,
      to: 1,
      target: "incoming",
    },
  ];
}

function pushLayers(
  axis: "translateX" | "translateY",
  dir: 1 | -1,
): TransitionLayerDto[] {
  // Incoming covers outgoing (push). Keep both fully opaque.
  return [
    {
      property: axis,
      from: 0,
      to: -dir,
      easing: "easeInOut",
      target: "outgoing",
    },
    {
      property: axis,
      from: dir,
      to: 0,
      easing: "easeInOut",
      target: "incoming",
    },
    {
      property: "opacity",
      from: 1,
      to: 1,
      target: "outgoing",
    },
    {
      property: "opacity",
      from: 1,
      to: 1,
      target: "incoming",
    },
  ];
}


// —— iMovie-style basic transitions (단일 탭: 기본형) ——

const BASIC: TransitionItemDto[] = [
  xfade("dissolve", TITLES.dissolve, "#A78BFA", "dissolve", {
    category: "basic",
    layers: [
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "linear",
        target: "outgoing",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "linear",
        target: "incoming",
      },
    ],
  }),
  xfade("crossblur", TITLES.crossblur, "#818CF8", "dissolve", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "blur",
        from: 0,
        to: 12,
        easing: "easeIn",
        target: "outgoing",
        end: 0.55,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "outgoing",
        start: 0.25,
        end: 0.7,
      },
      {
        property: "blur",
        from: 12,
        to: 0,
        easing: "easeOut",
        target: "incoming",
        start: 0.35,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        start: 0.3,
        end: 0.75,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("fadeblack", TITLES.fadeblack, "#1F2937", "fadeblack", {
    category: "basic",
    renderer: "primitive",
    // Classic dip: keep a continuous A↔B crossfade while brightness dips to
    // black at the midpoint, then recovers. Sequential opacity windows left a
    // fully transparent gap at t=0.5.
    layers: [
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "outgoing",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "incoming",
      },
      {
        property: "brightness",
        from: 0,
        to: -1,
        easing: "easeInOut",
        target: "both",
        start: 0,
        end: 0.5,
      },
      {
        property: "brightness",
        from: -1,
        to: 0,
        easing: "easeInOut",
        target: "both",
        start: 0.5,
        end: 1,
      },
    ],
  }),
  xfade("fadewhite", TITLES.fadewhite, "#E5E7EB", "fadewhite", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "outgoing",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "incoming",
      },
      {
        property: "brightness",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "both",
        start: 0,
        end: 0.5,
      },
      {
        property: "brightness",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "both",
        start: 0.5,
        end: 1,
      },
    ],
  }),
  xfade("spinin", TITLES.spinin, "#65A30D", "circleopen", {
    category: "basic",
    renderer: "primitive",
    // A stays as a solid backdrop; B spins/scales in on top.
    layers: [
      {
        property: "rotation",
        from: -0.12,
        to: 0,
        easing: "easeOut",
        target: "incoming",
      },
      {
        property: "scale",
        from: 0.4,
        to: 1,
        easing: "easeOut",
        target: "incoming",
      },
    ],
  }),
  xfade("spinout", TITLES.spinout, "#4D7C0F", "circleclose", {
    category: "basic",
    renderer: "primitive",
    // B is already the full backdrop; A spins/scales away on top.
    layers: [
      {
        property: "rotation",
        from: 0,
        to: 0.12,
        easing: "easeIn",
        target: "outgoing",
      },
      {
        property: "scale",
        from: 1,
        to: 0.4,
        easing: "easeIn",
        target: "outgoing",
      },
    ],
  }),
  xfade("circleopen", TITLES.circleopen, "#F472B6", "circleopen", {
    category: "basic",
  }),
  xfade("circleclose", TITLES.circleclose, "#EC4899", "circleclose", {
    category: "basic",
  }),
  xfade("doorway", TITLES.doorway, "#84CC16", "horzopen", {
    category: "basic",
    renderer: "primitive",
    customId: "doorway",
    // Preview uses a dedicated doorway compositor (A splits L/R, B comes through).
    layers: [],
  }),
  xfade("swap", TITLES.swap, "#A3E635", "slideleft", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "translateX",
        from: 0,
        to: -1,
        easing: "easeInOut",
        target: "outgoing",
      },
      {
        property: "translateX",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "incoming",
      },
      {
        property: "scale",
        from: 1,
        to: 0.92,
        target: "outgoing",
        start: 0,
        end: 0.5,
      },
      {
        property: "scale",
        from: 0.92,
        to: 1,
        target: "incoming",
        start: 0.5,
        end: 1,
      },
      ...opacityCross,
    ],
  }),
  xfade("cube", TITLES.cube, "#38BDF8", "slideleft", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "translateX",
        from: 0,
        to: -1,
        easing: "easeInOut",
        target: "outgoing",
      },
      {
        property: "scale",
        from: 1,
        to: 0.85,
        easing: "easeInOut",
        target: "outgoing",
      },
      {
        property: "opacity",
        from: 1,
        to: 0.6,
        target: "outgoing",
        end: 0.55,
      },
      {
        property: "translateX",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "incoming",
      },
      {
        property: "scale",
        from: 0.85,
        to: 1,
        easing: "easeInOut",
        target: "incoming",
      },
      {
        property: "opacity",
        from: 0.6,
        to: 1,
        target: "incoming",
        start: 0.45,
      },
    ],
  }),
  xfade("mosaic", TITLES.mosaic, "#F97316", "pixelize", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "blur",
        from: 0,
        to: 8,
        target: "outgoing",
        end: 0.5,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "outgoing",
        start: 0.35,
        end: 0.65,
      },
      {
        property: "blur",
        from: 8,
        to: 0,
        target: "incoming",
        start: 0.5,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "incoming",
        start: 0.35,
        end: 0.65,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("wipeleft", TITLES.wipeleft, "#34D399", "wipeleft", {
    category: "basic",
  }),
  xfade("wiperight", TITLES.wiperight, "#2DD4BF", "wiperight", {
    category: "basic",
  }),
  xfade("wipeup", TITLES.wipeup, "#5EEAD4", "wipeup", {
    category: "basic",
  }),
  xfade("wipedown", TITLES.wipedown, "#14B8A6", "wipedown", {
    category: "basic",
  }),
  xfade("slideleft", TITLES.slideleft, "#FBBF24", "slideleft", {
    category: "basic",
    renderer: "primitive",
    layers: slideLayers("translateX", 1),
  }),
  xfade("slideright", TITLES.slideright, "#F59E0B", "slideright", {
    category: "basic",
    renderer: "primitive",
    layers: slideLayers("translateX", -1),
  }),
  xfade("puzzleleft", TITLES.puzzleleft, "#FB923C", "wipeleft", {
    category: "basic",
    renderer: "primitive",
    customId: "puzzleleft",
    // Preview: B split into 3 vertical strips that slide in sequentially.
    layers: [],
  }),
  xfade("puzzleright", TITLES.puzzleright, "#F97316", "wiperight", {
    category: "basic",
    renderer: "primitive",
    customId: "puzzleright",
    layers: [],
  }),
  xfade("crosszoom", TITLES.crosszoom, "#22D3EE", "fade", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.6,
        easing: "easeIn",
        target: "outgoing",
        param: "intensity",
      },
      {
        property: "blur",
        from: 0,
        to: 6,
        target: "outgoing",
        end: 0.55,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "outgoing",
        start: 0.35,
        end: 0.7,
      },
      {
        property: "scale",
        from: 1.6,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        param: "intensity",
      },
      {
        property: "blur",
        from: 6,
        to: 0,
        target: "incoming",
        start: 0.45,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "incoming",
        start: 0.3,
        end: 0.65,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("ripple", TITLES.ripple, "#06B6D4", "hblur", {
    category: "basic",
    renderer: "primitive",
    customId: "radialWave",
    version: 2,
    // Preview uses the radialWave engine (concentric waves from center).
    // Params are server-owned; client does not hardcode ripple look.
    layers: [],
    effect: {
      type: "distortion",
      shape: "radial",
      source: "wave",
      wave: {
        frequency: 28,
        amplitude: 0.045,
        width: 0.14,
      },
      center: [0.5, 0.5],
    },
    parameters: intensityParam,
    controls: [intensityControl],
  }),
];

export const TRANSITION_CATALOG: TransitionCatalogDto = {
  version: 23,
  baseUrl: "",
  categories: [
    {
      id: "basic",
      title: CATEGORY_BASIC_TITLES.en,
      titles: CATEGORY_BASIC_TITLES,
      items: BASIC,
    },
  ],
  items: BASIC,
};

export function buildTransitionCatalog(): TransitionCatalogDto {
  return TRANSITION_CATALOG;
}

export { corsHeaders };

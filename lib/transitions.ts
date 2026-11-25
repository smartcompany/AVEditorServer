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
    /** Turns around the vertical axis. 0.5 = half turn; the back face is the other clip. */
    | "rotationY"
    /**
     * Concentric wave progress. 0 = A untouched, 1 = wave has passed and B
     * fills the frame. `parameters.intensity` scales the ring bulge only.
     */
    | "ripple"
    | "blur"
    | "brightness"
    | "saturation"
    | "contrast"
    /** Progressive clip. 0 = full clip, 1 = fully wiped away. `mode` = edge. */
    | "wipe";
  from: number;
  to: number;
  easing?: string;
  /** Which clip: `A` (leaving) | `B` (entering) | `both`. */
  target?: "A" | "B" | "both";
  bezier?: number[];
  /** Normalized progress window [0,1]. Defaults to full span. */
  start?: number;
  end?: number;
  /**
   * When set, endpoints are scaled toward the property identity by
   * `parameters[param]` (e.g. intensity). Authors write values at param=1.
   */
  param?: string;
  /**
   * Optional renderer hint.
   * - `blur`: `"zoom"` = radial; omit / `"gaussian"` = soft.
   * - `wipe`: edge erased first — `"left"` | `"right"` | `"top"` | `"bottom"`.
   */
  mode?: string;
  /**
   * When set, this layer is evaluated per cell instead of on the whole frame.
   * The first gridded layer defines columns, rows, and gap. Each layer's
   * `stagger` shifts only that property.
   */
  grid?: TransitionGridDto;
};

export type TransitionGridDto = {
  /** 1…8. */
  columns?: number;
  /** 1…8. */
  rows?: number;
  /** Inset of each cell as a fraction of the cell size. 0 = no gutter. */
  gap?: number;
  /**
   * 0…0.95. Fraction of the timeline used to spread cell start times.
   * 0 = every cell uses the same `t`.
   */
  stagger?: number;
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
  /** free | plus | pro — effects never cost credits. */
  accessTier?: "free" | "plus" | "pro";
  /** Legacy mirror: true when accessTier is plus or pro. */
  premium?: boolean;
  thumbnailUrl?: string;
  previewUrl?: string;
  assetUrl?: string;
  shader?: string;
  customId?: string;
  /**
   * Optional server-driven effect DSL for specialized compositors.
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
  accessTier?: "free" | "plus" | "pro";
  premium?: boolean;
  layers?: TransitionLayerDto[];
  parameters?: Record<string, TransitionParameterDto>;
  controls?: TransitionControlDto[];
  /** When set, renderer becomes primitive but still exports via ffmpegName. */
  renderer?: TransitionRenderer;
  /**
   * Legacy alias for `effect.kind`. Prefer `effect: { kind, …params }`.
   * Client never matches on catalog item id.
   */
  customId?: string;
  /**
   * Server-driven effect DSL. `kind` selects a built-in client compositor
   * (doorway / puzzle / wipe / …); remaining keys are compositor params.
   */
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
    accessTier: opts.accessTier ?? (opts.premium ? "pro" : "free"),
    premium: (opts.accessTier ?? (opts.premium ? "pro" : "free")) !== "free",
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
    // Incoming grows from center while rotating — reads as "outward".
    ko: "밖으로 회전",
    ja: "スピンイン",
    zh: "旋入",
  },
  spinout: {
    en: "Spin Out",
    // Outgoing shrinks toward center while rotating — reads as "inward".
    ko: "안으로 회전",
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
  // —— CapCut / iMovie-style fills (layer DSL only; no new client kinds) ——
  slideup: {
    en: "Slide Up",
    ko: "위로 슬라이드",
    ja: "スライド上",
    zh: "向上滑动",
  },
  slidedown: {
    en: "Slide Down",
    ko: "아래로 슬라이드",
    ja: "スライド下",
    zh: "向下滑动",
  },
  zoomin: {
    en: "Zoom In",
    ko: "확대",
    ja: "ズームイン",
    zh: "放大",
  },
  zoomout: {
    en: "Zoom Out",
    ko: "축소",
    ja: "ズームアウト",
    zh: "缩小",
  },
  flash: {
    en: "Flash",
    ko: "플래시",
    ja: "フラッシュ",
    zh: "闪光",
  },
  rotate: {
    en: "Rotate",
    ko: "회전",
    ja: "回転",
    zh: "旋转",
  },
  spinblur: {
    en: "Spin Blur",
    ko: "스핀 블러",
    ja: "スピンブラー",
    zh: "旋转模糊",
  },
  flip: {
    en: "Flip",
    ko: "플립",
    ja: "フリップ",
    zh: "翻转",
  },
  bounce: {
    en: "Bounce",
    ko: "바운스",
    ja: "バウンス",
    zh: "弹跳",
  },
  whipleft: {
    en: "Whip Left",
    ko: "왼쪽으로 휩",
    ja: "ウィップ左",
    zh: "向左甩动",
  },
  whipright: {
    en: "Whip Right",
    ko: "오른쪽으로 휩",
    ja: "ウィップ右",
    zh: "向右甩动",
  },
  squeezeh: {
    en: "Squeeze Horizontal",
    ko: "가로 짜기",
    ja: "横スクイーズ",
    zh: "横向挤压",
  },
  squeezev: {
    en: "Squeeze Vertical",
    ko: "세로 짜기",
    ja: "縦スクイーズ",
    zh: "纵向挤压",
  },
  desaturate: {
    en: "Desaturate",
    ko: "채도 빼기",
    ja: "彩度オフ",
    zh: "去色",
  },
  glitch: {
    en: "Glitch",
    ko: "글리치",
    ja: "グリッチ",
    zh: "故障风",
  },
  smash: {
    en: "Smash Zoom",
    ko: "스매시 줌",
    ja: "スマッシュズーム",
    zh: "猛击缩放",
  },
  tilt: {
    en: "Tilt Slide",
    ko: "기울어 슬라이드",
    ja: "チルトスライド",
    zh: "倾斜滑动",
  },
  coverup: {
    en: "Cover Up",
    ko: "위로 덮기",
    ja: "上からカバー",
    zh: "上覆盖",
  },
  coverdown: {
    en: "Cover Down",
    ko: "아래로 덮기",
    ja: "下からカバー",
    zh: "下覆盖",
  },
  blinds: {
    en: "Blinds",
    ko: "블라인드",
    ja: "ブラインド",
    zh: "百叶窗",
  },
  tiles: {
    en: "Tiles",
    ko: "타일",
    ja: "タイル",
    zh: "拼贴",
  },
  swing: {
    en: "Swing",
    ko: "스윙",
    ja: "スイング",
    zh: "摆动",
  },
  softzoom: {
    en: "Soft Zoom",
    ko: "소프트 줌",
    ja: "ソフトズーム",
    zh: "柔和缩放",
  },
  filmfade: {
    en: "Film Fade",
    ko: "필름 페이드",
    ja: "フィルムフェード",
    zh: "胶片淡出",
  },
  pushleft: {
    en: "Push Left",
    ko: "왼쪽으로 밀기",
    ja: "プッシュ左",
    zh: "向左推",
  },
  pushright: {
    en: "Push Right",
    ko: "오른쪽으로 밀기",
    ja: "プッシュ右",
    zh: "向右推",
  },
  roll: {
    en: "Roll",
    ko: "롤",
    ja: "ロール",
    zh: "翻滚",
  },
  stamp: {
    en: "Stamp",
    ko: "스탬프",
    ja: "スタンプ",
    zh: "盖章",
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
    target: "A",
  },
  {
    property: "opacity",
    from: 0,
    to: 1,
    easing: "easeInOut",
    target: "B",
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
      target: "A",
    },
    {
      property: axis,
      from: dir,
      to: 0,
      easing: "easeInOut",
      target: "B",
    },
    {
      property: "opacity",
      from: 1,
      to: 1,
      target: "A",
    },
    {
      property: "opacity",
      from: 1,
      to: 1,
      target: "B",
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
      target: "A",
    },
    {
      property: axis,
      from: dir,
      to: 0,
      easing: "easeInOut",
      target: "B",
    },
    {
      property: "opacity",
      from: 1,
      to: 1,
      target: "A",
    },
    {
      property: "opacity",
      from: 1,
      to: 1,
      target: "B",
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
        target: "A",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "linear",
        target: "B",
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
        target: "A",
        end: 0.55,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "A",
        start: 0.25,
        end: 0.7,
      },
      {
        property: "blur",
        from: 12,
        to: 0,
        easing: "easeOut",
        target: "B",
        start: 0.35,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "B",
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
        target: "A",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "B",
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
        target: "A",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "B",
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
    // Paint order = last A/B target. A is static backdrop; B mover is last → on top.
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1,
        target: "A",
      },
      {
        property: "rotation",
        from: -0.12,
        to: 0,
        easing: "easeOut",
        target: "B",
      },
      {
        property: "scale",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "B",
      },
    ],
  }),
  xfade("spinout", TITLES.spinout, "#4D7C0F", "circleclose", {
    category: "basic",
    renderer: "primitive",
    // B static backdrop first; A mover last → A on top (no client z-order inference).
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1,
        target: "B",
      },
      {
        property: "rotation",
        from: 0,
        to: 0.12,
        easing: "easeIn",
        target: "A",
      },
      {
        property: "scale",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "A",
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
    renderer: "custom",
    // Server picks the client compositor via effect.kind — never by catalog id.
    customId: "doorway",
    effect: {
      kind: "doorway",
      incomingScaleFrom: 0.84,
      incomingScaleTo: 1,
    },
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
        target: "A",
      },
      {
        property: "translateX",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "B",
      },
      {
        property: "scale",
        from: 1,
        to: 0.92,
        target: "A",
        start: 0,
        end: 0.5,
      },
      {
        property: "scale",
        from: 0.92,
        to: 1,
        target: "B",
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
        target: "A",
      },
      {
        property: "scale",
        from: 1,
        to: 0.85,
        easing: "easeInOut",
        target: "A",
      },
      {
        property: "opacity",
        from: 1,
        to: 0.6,
        target: "A",
        end: 0.55,
      },
      {
        property: "translateX",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "B",
      },
      {
        property: "scale",
        from: 0.85,
        to: 1,
        easing: "easeInOut",
        target: "B",
      },
      {
        property: "opacity",
        from: 0.6,
        to: 1,
        target: "B",
        start: 0.45,
      },
    ],
  }),
  xfade("mosaic", TITLES.mosaic, "#F97316", "pixelize", {
    category: "basic",
    renderer: "primitive",
    // A flips per cell; the back face is B. Grid numbers stay in the catalog.
    layers: [
      {
        property: "rotationY",
        from: 0,
        to: 0.5,
        easing: "easeInOut",
        target: "A",
        grid: { columns: 4, rows: 4, gap: 0.055, stagger: 0.58 },
      },
    ],
  }),
  xfade("wipeleft", TITLES.wipeleft, "#34D399", "wipeleft", {
    category: "basic",
    renderer: "primitive",
    // B full underneath; A wiped away from the right edge.
    layers: [
      { property: "scale", from: 1, to: 1, target: "B" },
      {
        property: "wipe",
        from: 0,
        to: 1,
        easing: "linear",
        target: "A",
        mode: "right",
      },
    ],
  }),
  xfade("wiperight", TITLES.wiperight, "#2DD4BF", "wiperight", {
    category: "basic",
    renderer: "primitive",
    // B full underneath; A wiped away from the left (edge travels right).
    layers: [
      { property: "scale", from: 1, to: 1, target: "B" },
      {
        property: "wipe",
        from: 0,
        to: 1,
        easing: "linear",
        target: "A",
        mode: "left",
      },
    ],
  }),
  xfade("wipeup", TITLES.wipeup, "#5EEAD4", "wipeup", {
    category: "basic",
    renderer: "primitive",
    // Same convention as left/right: name = edge travel direction.
    // Wipe up → erase A from the bottom so the edge moves upward.
    layers: [
      { property: "scale", from: 1, to: 1, target: "B" },
      {
        property: "wipe",
        from: 0,
        to: 1,
        easing: "linear",
        target: "A",
        mode: "bottom",
      },
    ],
  }),
  xfade("wipedown", TITLES.wipedown, "#14B8A6", "wipedown", {
    category: "basic",
    renderer: "primitive",
    // Wipe down → erase A from the top so the edge moves downward.
    layers: [
      { property: "scale", from: 1, to: 1, target: "B" },
      {
        property: "wipe",
        from: 0,
        to: 1,
        easing: "linear",
        target: "A",
        mode: "top",
      },
    ],
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
    renderer: "custom",
    customId: "puzzle",
    effect: {
      kind: "puzzle",
      reverse: false,
    },
    layers: [],
  }),
  xfade("puzzleright", TITLES.puzzleright, "#F97316", "wiperight", {
    category: "basic",
    renderer: "custom",
    customId: "puzzle",
    effect: {
      kind: "puzzle",
      reverse: true,
    },
    layers: [],
  }),
  xfade("crosszoom", TITLES.crosszoom, "#22D3EE", "fade", {
    category: "basic",
    renderer: "primitive",
    // iMovie Cross Zoom (from reference recording):
    // radial light streaks from center (not a flat white card) + slight spin,
    // then settle into B. Authored entirely as server layer vectors.
    layers: [
      {
        property: "scale",
        from: 1,
        to: 2.8,
        easing: "easeIn",
        target: "A",
        param: "intensity",
        end: 0.52,
      },
      {
        property: "rotation",
        from: 0,
        to: 0.08,
        easing: "easeIn",
        target: "A",
        end: 0.52,
      },
      {
        property: "blur",
        from: 0,
        to: 22,
        target: "A",
        end: 0.52,
        param: "intensity",
        mode: "zoom",
      },
      {
        // Mild lift only — streaks carry the “light”, not a full white wash.
        property: "brightness",
        from: 0,
        to: 0.45,
        easing: "easeIn",
        target: "A",
        start: 0.25,
        end: 0.5,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        start: 0.42,
        end: 0.55,
      },
      {
        property: "scale",
        from: 2.8,
        to: 1,
        easing: "easeOut",
        target: "B",
        param: "intensity",
        start: 0.48,
      },
      {
        property: "rotation",
        from: -0.08,
        to: 0,
        easing: "easeOut",
        target: "B",
        start: 0.48,
      },
      {
        property: "blur",
        from: 22,
        to: 0,
        target: "B",
        start: 0.48,
        param: "intensity",
        mode: "zoom",
      },
      {
        property: "brightness",
        from: 0.45,
        to: 0,
        easing: "easeOut",
        target: "B",
        start: 0.5,
        end: 0.85,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.48,
        end: 0.62,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("ripple", TITLES.ripple, "#06B6D4", "hblur", {
    category: "basic",
    renderer: "primitive",
    // Wave progress is the layer value. Intensity only scales the bulge.
    layers: [
      {
        property: "ripple",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "both",
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("slideup", TITLES.slideup, "#FCD34D", "slideup", {
    category: "basic",
    renderer: "primitive",
    layers: slideLayers("translateY", 1),
  }),
  xfade("slidedown", TITLES.slidedown, "#F59E0B", "slidedown", {
    category: "basic",
    renderer: "primitive",
    layers: slideLayers("translateY", -1),
  }),
  xfade("zoomin", TITLES.zoomin, "#67E8F9", "fade", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.55,
        easing: "easeIn",
        target: "A",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "A",
        start: 0.2,
      },
      {
        property: "scale",
        from: 0.72,
        to: 1,
        easing: "easeOut",
        target: "B",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "B",
        end: 0.75,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("zoomout", TITLES.zoomout, "#22D3EE", "fade", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "scale",
        from: 1,
        to: 0.55,
        easing: "easeIn",
        target: "A",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "A",
        start: 0.15,
      },
      {
        property: "scale",
        from: 1.45,
        to: 1,
        easing: "easeOut",
        target: "B",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "B",
        end: 0.8,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("flash", TITLES.flash, "#F8FAFC", "fadewhite", {
    category: "basic",
    renderer: "primitive",
    defaultDurationMs: 450,
    layers: [
      ...opacityCross,
      {
        property: "brightness",
        from: 0,
        to: 1.2,
        easing: "easeIn",
        target: "both",
        end: 0.45,
        param: "intensity",
      },
      {
        property: "brightness",
        from: 1.2,
        to: 0,
        easing: "easeOut",
        target: "both",
        start: 0.45,
        param: "intensity",
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("rotate", TITLES.rotate, "#A3E635", "fade", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "rotation",
        from: 0,
        to: 0.25,
        easing: "easeIn",
        target: "A",
      },
      {
        property: "scale",
        from: 1,
        to: 0.85,
        easing: "easeIn",
        target: "A",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "A",
        start: 0.25,
      },
      {
        property: "rotation",
        from: -0.25,
        to: 0,
        easing: "easeOut",
        target: "B",
      },
      {
        property: "scale",
        from: 0.85,
        to: 1,
        easing: "easeOut",
        target: "B",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "B",
        end: 0.75,
      },
    ],
  }),
  xfade("spinblur", TITLES.spinblur, "#84CC16", "hblur", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "rotation",
        from: 0,
        to: 0.35,
        easing: "easeIn",
        target: "A",
        end: 0.55,
      },
      {
        property: "blur",
        from: 0,
        to: 18,
        target: "A",
        end: 0.55,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        start: 0.35,
        end: 0.6,
      },
      {
        property: "rotation",
        from: -0.35,
        to: 0,
        easing: "easeOut",
        target: "B",
        start: 0.45,
      },
      {
        property: "blur",
        from: 18,
        to: 0,
        target: "B",
        start: 0.45,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.45,
        end: 0.7,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("flip", TITLES.flip, "#38BDF8", "slideleft", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "rotationY",
        from: 0,
        to: 0.5,
        easing: "easeInOut",
        target: "A",
      },
    ],
  }),
  xfade("bounce", TITLES.bounce, "#FB7185", "fade", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "scale",
        from: 1,
        to: 0.7,
        easing: "easeIn",
        target: "A",
        end: 0.45,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        start: 0.25,
        end: 0.5,
      },
      {
        property: "scale",
        from: 1.28,
        to: 0.94,
        easing: "easeOut",
        target: "B",
        start: 0.4,
        end: 0.78,
        param: "intensity",
      },
      {
        property: "scale",
        from: 0.94,
        to: 1,
        easing: "easeOut",
        target: "B",
        start: 0.78,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.4,
        end: 0.65,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("whipleft", TITLES.whipleft, "#C084FC", "slideleft", {
    category: "basic",
    renderer: "primitive",
    defaultDurationMs: 400,
    layers: [
      {
        property: "translateX",
        from: 0,
        to: -1.15,
        easing: "easeIn",
        target: "A",
      },
      {
        property: "blur",
        from: 0,
        to: 14,
        target: "A",
        end: 0.7,
        param: "intensity",
        mode: "zoom",
      },
      {
        property: "translateX",
        from: 1.15,
        to: 0,
        easing: "easeOut",
        target: "B",
      },
      {
        property: "blur",
        from: 14,
        to: 0,
        target: "B",
        start: 0.3,
        param: "intensity",
        mode: "zoom",
      },
      {
        property: "opacity",
        from: 1,
        to: 1,
        target: "A",
      },
      {
        property: "opacity",
        from: 1,
        to: 1,
        target: "B",
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("whipright", TITLES.whipright, "#A855F7", "slideright", {
    category: "basic",
    renderer: "primitive",
    defaultDurationMs: 400,
    layers: [
      {
        property: "translateX",
        from: 0,
        to: 1.15,
        easing: "easeIn",
        target: "A",
      },
      {
        property: "blur",
        from: 0,
        to: 14,
        target: "A",
        end: 0.7,
        param: "intensity",
        mode: "zoom",
      },
      {
        property: "translateX",
        from: -1.15,
        to: 0,
        easing: "easeOut",
        target: "B",
      },
      {
        property: "blur",
        from: 14,
        to: 0,
        target: "B",
        start: 0.3,
        param: "intensity",
        mode: "zoom",
      },
      {
        property: "opacity",
        from: 1,
        to: 1,
        target: "A",
      },
      {
        property: "opacity",
        from: 1,
        to: 1,
        target: "B",
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("squeezeh", TITLES.squeezeh, "#F472B6", "fade", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "scale",
        from: 1,
        to: 0.05,
        easing: "easeIn",
        target: "A",
        end: 0.5,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        start: 0.35,
        end: 0.55,
      },
      {
        property: "scale",
        from: 0.05,
        to: 1,
        easing: "easeOut",
        target: "B",
        start: 0.5,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.45,
        end: 0.65,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("squeezev", TITLES.squeezev, "#E879F9", "fade", {
    category: "basic",
    renderer: "primitive",
    // Uniform scale approximates a vertical squeeze in the layer DSL.
    layers: [
      {
        property: "scale",
        from: 1,
        to: 0.08,
        easing: "easeIn",
        target: "A",
        end: 0.5,
        param: "intensity",
      },
      {
        property: "translateY",
        from: 0,
        to: 0.08,
        target: "A",
        end: 0.5,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        start: 0.35,
        end: 0.55,
      },
      {
        property: "scale",
        from: 0.08,
        to: 1,
        easing: "easeOut",
        target: "B",
        start: 0.5,
        param: "intensity",
      },
      {
        property: "translateY",
        from: -0.08,
        to: 0,
        target: "B",
        start: 0.5,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.45,
        end: 0.65,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("desaturate", TITLES.desaturate, "#94A3B8", "dissolve", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "saturation",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "A",
        end: 0.5,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "A",
      },
      {
        property: "saturation",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "B",
        start: 0.5,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "B",
      },
    ],
  }),
  xfade("glitch", TITLES.glitch, "#22C55E", "pixelize", {
    category: "basic",
    renderer: "primitive",
    defaultDurationMs: 500,
    layers: [
      {
        property: "translateX",
        from: 0,
        to: 0.06,
        target: "A",
        end: 0.2,
        param: "intensity",
      },
      {
        property: "translateX",
        from: 0.06,
        to: -0.08,
        target: "A",
        start: 0.2,
        end: 0.4,
        param: "intensity",
      },
      {
        property: "brightness",
        from: 0,
        to: 0.35,
        target: "A",
        start: 0.15,
        end: 0.35,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        start: 0.35,
        end: 0.55,
      },
      {
        property: "translateX",
        from: -0.08,
        to: 0.04,
        target: "B",
        start: 0.4,
        end: 0.65,
        param: "intensity",
      },
      {
        property: "translateX",
        from: 0.04,
        to: 0,
        target: "B",
        start: 0.65,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.4,
        end: 0.6,
      },
      {
        property: "saturation",
        from: 1.4,
        to: 1,
        target: "B",
        start: 0.45,
        end: 0.85,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("smash", TITLES.smash, "#EF4444", "fade", {
    category: "basic",
    renderer: "primitive",
    defaultDurationMs: 480,
    layers: [
      {
        property: "scale",
        from: 1,
        to: 2.2,
        easing: "easeIn",
        target: "A",
        end: 0.45,
        param: "intensity",
      },
      {
        property: "blur",
        from: 0,
        to: 10,
        target: "A",
        end: 0.45,
        mode: "zoom",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        start: 0.3,
        end: 0.5,
      },
      {
        property: "scale",
        from: 1.55,
        to: 1,
        easing: "easeOut",
        target: "B",
        start: 0.42,
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.42,
        end: 0.62,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("tilt", TITLES.tilt, "#F97316", "slideleft", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "rotation",
        from: 0,
        to: -0.06,
        target: "A",
      },
      {
        property: "translateX",
        from: 0,
        to: -1,
        easing: "easeInOut",
        target: "A",
      },
      {
        property: "rotation",
        from: 0.06,
        to: 0,
        target: "B",
      },
      {
        property: "translateX",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "B",
      },
      {
        property: "opacity",
        from: 1,
        to: 1,
        target: "A",
      },
      {
        property: "opacity",
        from: 1,
        to: 1,
        target: "B",
      },
    ],
  }),
  xfade("coverup", TITLES.coverup, "#FBBF24", "slideup", {
    category: "basic",
    renderer: "primitive",
    layers: pushLayers("translateY", 1),
  }),
  xfade("coverdown", TITLES.coverdown, "#F59E0B", "slidedown", {
    category: "basic",
    renderer: "primitive",
    layers: pushLayers("translateY", -1),
  }),
  xfade("blinds", TITLES.blinds, "#64748B", "pixelize", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "A",
        grid: { columns: 1, rows: 8, gap: 0.02, stagger: 0.7 },
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "B",
        grid: { columns: 1, rows: 8, gap: 0.02, stagger: 0.7 },
      },
    ],
  }),
  xfade("tiles", TITLES.tiles, "#EA580C", "pixelize", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "rotationY",
        from: 0,
        to: 0.5,
        easing: "easeInOut",
        target: "A",
        grid: { columns: 3, rows: 3, gap: 0.04, stagger: 0.62 },
      },
    ],
  }),
  xfade("swing", TITLES.swing, "#0EA5E9", "slideleft", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "rotation",
        from: 0,
        to: -0.18,
        easing: "easeIn",
        target: "A",
        end: 0.55,
      },
      {
        property: "translateX",
        from: 0,
        to: -0.35,
        target: "A",
        end: 0.55,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        start: 0.3,
        end: 0.6,
      },
      {
        property: "rotation",
        from: 0.18,
        to: 0,
        easing: "easeOut",
        target: "B",
        start: 0.4,
      },
      {
        property: "translateX",
        from: 0.35,
        to: 0,
        target: "B",
        start: 0.4,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.4,
        end: 0.7,
      },
    ],
  }),
  xfade("softzoom", TITLES.softzoom, "#2DD4BF", "fade", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.18,
        easing: "easeInOut",
        target: "A",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "A",
      },
      {
        property: "scale",
        from: 1.12,
        to: 1,
        easing: "easeInOut",
        target: "B",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "B",
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
  xfade("filmfade", TITLES.filmfade, "#78716C", "fadeblack", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "saturation",
        from: 1,
        to: 0.35,
        target: "A",
        end: 0.55,
      },
      {
        property: "brightness",
        from: 0,
        to: -0.55,
        easing: "easeIn",
        target: "A",
        end: 0.55,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "A",
      },
      {
        property: "brightness",
        from: -0.35,
        to: 0,
        easing: "easeOut",
        target: "B",
        start: 0.45,
      },
      {
        property: "saturation",
        from: 0.45,
        to: 1,
        target: "B",
        start: 0.45,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "B",
      },
    ],
  }),
  xfade("pushleft", TITLES.pushleft, "#FACC15", "slideleft", {
    category: "basic",
    renderer: "primitive",
    layers: pushLayers("translateX", 1),
  }),
  xfade("pushright", TITLES.pushright, "#EAB308", "slideright", {
    category: "basic",
    renderer: "primitive",
    layers: pushLayers("translateX", -1),
  }),
  xfade("roll", TITLES.roll, "#4ADE80", "circleopen", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "rotation",
        from: 0,
        to: 1,
        easing: "easeInOut",
        target: "A",
      },
      {
        property: "scale",
        from: 1,
        to: 0.55,
        easing: "easeIn",
        target: "A",
        end: 0.55,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        start: 0.4,
        end: 0.65,
      },
      {
        property: "rotation",
        from: -1,
        to: 0,
        easing: "easeInOut",
        target: "B",
      },
      {
        property: "scale",
        from: 0.55,
        to: 1,
        easing: "easeOut",
        target: "B",
        start: 0.45,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.4,
        end: 0.7,
      },
    ],
  }),
  xfade("stamp", TITLES.stamp, "#F43F5E", "fade", {
    category: "basic",
    renderer: "primitive",
    defaultDurationMs: 420,
    layers: [
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "A",
        end: 0.35,
      },
      {
        property: "scale",
        from: 1.65,
        to: 0.92,
        easing: "easeOut",
        target: "B",
        start: 0.2,
        end: 0.72,
        param: "intensity",
      },
      {
        property: "scale",
        from: 0.92,
        to: 1,
        easing: "easeOut",
        target: "B",
        start: 0.72,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "B",
        start: 0.2,
        end: 0.4,
      },
    ],
    parameters: intensityParam,
    controls: [intensityControl],
  }),
];

/**
 * Effect access tiers (CapCut-style). Credits are AI-only — these never
 * cost credits. Plus unlocks Plus; Pro/Studio unlock Plus + Pro.
 */
export const PLUS_TRANSITION_IDS = new Set<string>([
  "spinin",
  "spinout",
  "doorway",
  "swap",
  // Formerly Pro — Plus-only catalog until Pro is sold.
  "cube",
  "mosaic",
  "puzzleleft",
  "puzzleright",
  "crosszoom",
  "ripple",
  "spinblur",
  "flip",
  "glitch",
  "smash",
  "blinds",
  "tiles",
  "roll",
  "stamp",
]);

export const PRO_TRANSITION_IDS = new Set<string>([]);

/** @deprecated Prefer PLUS_ / PRO_TRANSITION_IDS. */
export const PREMIUM_TRANSITION_IDS = new Set<string>([
  ...PLUS_TRANSITION_IDS,
  ...PRO_TRANSITION_IDS,
]);

for (const item of BASIC) {
  const accessTier = PRO_TRANSITION_IDS.has(item.id)
    ? "pro"
    : PLUS_TRANSITION_IDS.has(item.id)
      ? "plus"
      : "free";
  item.accessTier = accessTier;
  item.premium = accessTier !== "free";
}

export const TRANSITION_CATALOG: TransitionCatalogDto = {
  version: 0,
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

/** CORS for catalog GET + dashboard PUT. */
export function catalogCorsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-dashboard-secret",
  };
}

export { corsHeaders };

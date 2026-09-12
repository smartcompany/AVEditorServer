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

export type TransitionItemDto = {
  id: string;
  version: number;
  title: string;
  name?: string;
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
  downloadSizeBytes?: number;
  itemVersion?: number;
  layers?: TransitionLayerDto[];
  parameters?: Record<string, TransitionParameterDto>;
  controls?: TransitionControlDto[];
};

export type TransitionCategoryDto = {
  id: string;
  title: string;
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
};

function xfade(
  id: string,
  title: string,
  accent: string,
  ffmpegName: string,
  opts: XfadeOpts = {},
): TransitionItemDto {
  const renderer = opts.renderer ?? "xfade";
  return {
    id,
    version: 1,
    itemVersion: 1,
    title,
    name: title,
    category: opts.category ?? "basic",
    renderer,
    effectType: renderer === "cut" ? "cut" : "xfade",
    ffmpegName,
    defaultDurationMs: opts.defaultDurationMs ?? 500,
    minDurationMs: opts.minDurationMs ?? 100,
    maxDurationMs: opts.maxDurationMs ?? 3000,
    accent,
    premium: opts.premium ?? false,
    thumbnailUrl: `transitions/thumbs/${id}.webp`,
    layers: opts.layers,
    parameters: opts.parameters,
    controls: opts.controls,
  };
}

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

/** CapCut-style cursor zoom — authored at intensity=1; client scales via param. */
const cursorZoomLayers: TransitionLayerDto[] = [
  {
    property: "scale",
    from: 1,
    to: 1.8,
    easing: "easeInOut",
    target: "outgoing",
    start: 0,
    end: 0.5,
    param: "intensity",
  },
  {
    property: "scale",
    from: 1.8,
    to: 1.8,
    target: "outgoing",
    start: 0.5,
    end: 1,
    param: "intensity",
  },
  {
    property: "opacity",
    from: 1,
    to: 0,
    easing: "easeInOut",
    target: "outgoing",
    start: 0.42,
    end: 0.58,
  },
  {
    property: "scale",
    from: 1.8,
    to: 1.8,
    target: "incoming",
    start: 0,
    end: 0.5,
    param: "intensity",
  },
  {
    property: "scale",
    from: 1.8,
    to: 1,
    easing: "easeInOut",
    target: "incoming",
    start: 0.5,
    end: 1,
    param: "intensity",
  },
  {
    property: "opacity",
    from: 0,
    to: 1,
    easing: "easeInOut",
    target: "incoming",
    start: 0.42,
    end: 0.58,
  },
];

const flashLayers: TransitionLayerDto[] = [
  { property: "opacity", from: 1, to: 0, target: "outgoing" },
  { property: "opacity", from: 0, to: 1, target: "incoming" },
  {
    property: "brightness",
    from: 0,
    to: 1,
    easing: "easeOut",
    target: "both",
    start: 0,
    end: 0.5,
    param: "intensity",
  },
  {
    property: "brightness",
    from: 1,
    to: 0,
    easing: "easeIn",
    target: "both",
    start: 0.5,
    end: 1,
    param: "intensity",
  },
];

const BASIC: TransitionItemDto[] = [
  {
    id: "none",
    version: 1,
    itemVersion: 1,
    title: "None",
    name: "None",
    category: "basic",
    renderer: "cut",
    effectType: "cut",
    ffmpegName: "",
    defaultDurationMs: 0,
    minDurationMs: 0,
    maxDurationMs: 0,
    accent: "#6B7280",
  },
  xfade("fade", "Fade", "#60A5FA", "fade", {
    category: "basic",
    layers: [
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeInOut",
        target: "outgoing",
      },
    ],
  }),
  xfade("dissolve", "Cross Dissolve", "#A78BFA", "dissolve", {
    category: "dissolve",
    layers: [
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "linear",
        target: "outgoing",
      },
    ],
  }),
  xfade("fadeblack", "Dip To Black", "#1F2937", "fadeblack", {
    category: "dissolve",
  }),
  xfade("fadewhite", "Dip To White", "#E5E7EB", "fadewhite", {
    category: "dissolve",
  }),
  xfade("flash", "Flash", "#FDE68A", "fadewhite", {
    category: "effect",
    defaultDurationMs: 250,
    minDurationMs: 80,
    maxDurationMs: 800,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: flashLayers,
    renderer: "primitive",
  }),
];

const MOTION: TransitionItemDto[] = [
  xfade("slideleft", "Slide Left", "#FBBF24", "slideleft", {
    category: "motion",
    layers: [
      {
        property: "translateX",
        from: 0,
        to: -1,
        easing: "easeInOut",
        target: "outgoing",
      },
    ],
  }),
  xfade("slideright", "Slide Right", "#F59E0B", "slideright", {
    category: "motion",
  }),
  xfade("slideup", "Slide Up", "#FCD34D", "slideup", { category: "motion" }),
  xfade("slidedown", "Slide Down", "#D97706", "slidedown", {
    category: "motion",
  }),
  xfade("pushleft", "Push Left", "#34D399", "coverleft", {
    category: "motion",
  }),
  xfade("pushright", "Push Right", "#10B981", "coverright", {
    category: "motion",
  }),
  xfade("pushup", "Push Up", "#6EE7B7", "coverup", { category: "motion" }),
  xfade("pushdown", "Push Down", "#059669", "coverdown", {
    category: "motion",
  }),
];

const ZOOM: TransitionItemDto[] = [
  xfade("zoomin", "커서 확대/축소", "#F472B6", "zoomin", {
    category: "zoom",
    renderer: "primitive",
    defaultDurationMs: 4000,
    minDurationMs: 500,
    maxDurationMs: 8000,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: cursorZoomLayers,
  }),
  xfade("zoomout", "Zoom Out", "#FB7185", "squeezev", {
    category: "zoom",
    renderer: "primitive",
    parameters: intensityParam,
    controls: [intensityControl],
    layers: [
      {
        property: "scale",
        from: 1.35,
        to: 1,
        easing: "easeInOut",
        target: "outgoing",
      },
    ],
  }),
  xfade("crosszoom", "Cross Zoom", "#E879F9", "zoomin", {
    category: "zoom",
    renderer: "primitive",
    parameters: intensityParam,
    controls: [intensityControl],
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.25,
        easing: "easeIn",
        target: "outgoing",
      },
      {
        property: "scale",
        from: 1.25,
        to: 1,
        easing: "easeOut",
        target: "incoming",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "linear",
        target: "outgoing",
      },
    ],
  }),
  xfade("zoomblur", "Zoom Blur", "#C084FC", "hblur", {
    category: "zoom",
    renderer: "primitive",
    parameters: intensityParam,
    controls: [intensityControl],
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.3,
        easing: "easeInOut",
        target: "incoming",
      },
      {
        property: "blur",
        from: 0,
        to: 10,
        easing: "easeOut",
        target: "both",
      },
    ],
  }),
];

const WIPE: TransitionItemDto[] = [
  xfade("wipeleft", "Wipe Left", "#34D399", "wipeleft", { category: "wipe" }),
  xfade("wiperight", "Wipe Right", "#2DD4BF", "wiperight", {
    category: "wipe",
  }),
  xfade("wipeup", "Wipe Up", "#5EEAD4", "wipeup", { category: "wipe" }),
  xfade("wipedown", "Wipe Down", "#14B8A6", "wipedown", { category: "wipe" }),
  xfade("circleopen", "Circle / Iris", "#F472B6", "circleopen", {
    category: "wipe",
    defaultDurationMs: 600,
  }),
  xfade("radial", "Radial Wipe", "#FB7185", "radial", { category: "wipe" }),
];

const TRENDING: TransitionItemDto[] = [
  xfade("fade", "Fade", "#60A5FA", "fade", { category: "trending" }),
  xfade("zoomin", "커서 확대/축소", "#F472B6", "zoomin", {
    category: "trending",
    renderer: "primitive",
    defaultDurationMs: 4000,
    minDurationMs: 500,
    maxDurationMs: 8000,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: cursorZoomLayers,
  }),
  xfade("flash", "Flash", "#FDE68A", "fadewhite", {
    category: "trending",
    defaultDurationMs: 250,
    renderer: "primitive",
    parameters: intensityParam,
    controls: [intensityControl],
    layers: flashLayers,
  }),
  xfade("pushleft", "Push Left", "#34D399", "coverleft", {
    category: "trending",
  }),
  xfade("crosszoom", "Cross Zoom", "#E879F9", "zoomin", {
    category: "trending",
    renderer: "primitive",
  }),
  xfade("slideleft", "Slide Left", "#FBBF24", "slideleft", {
    category: "trending",
  }),
];

function uniqueItems(groups: TransitionItemDto[][]): TransitionItemDto[] {
  const byId = new Map<string, TransitionItemDto>();
  for (const group of groups) {
    for (const item of group) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

/** CapCut-like phase-1 catalog; clients merge with offline fallbacks. */
export const TRANSITION_CATALOG: TransitionCatalogDto = {
  version: 6,
  baseUrl: "",
  categories: [
    { id: "trending", title: "Trending", items: TRENDING },
    { id: "basic", title: "Basic", items: BASIC },
    { id: "dissolve", title: "Dissolve", items: BASIC.filter((i) => i.category === "dissolve" || i.id === "fade") },
    { id: "motion", title: "Motion", items: MOTION },
    { id: "zoom", title: "Zoom", items: ZOOM },
    { id: "wipe", title: "Wipe", items: WIPE },
    {
      id: "effect",
      title: "Effect",
      items: BASIC.filter((i) => i.category === "effect"),
    },
  ],
  items: uniqueItems([BASIC, MOTION, ZOOM, WIPE]),
};

export function buildTransitionCatalog(): TransitionCatalogDto {
  return TRANSITION_CATALOG;
}

export { corsHeaders };

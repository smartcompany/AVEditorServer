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
  version?: number;
};

function xfade(
  id: string,
  title: string,
  accent: string,
  ffmpegName: string,
  opts: XfadeOpts = {},
): TransitionItemDto {
  const renderer = opts.renderer ?? "xfade";
  const version = opts.version ?? 1;
  return {
    id,
    version,
    itemVersion: version,
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

/**
 * Cursor Zoom (docs/transitions-spec.md):
 * click → center zooms in → zooms out while the next clip appears.
 */
const cursorZoomLayers: TransitionLayerDto[] = [
  // Hold briefly (click beat), then zoom in on A.
  {
    property: "scale",
    from: 1,
    to: 1,
    target: "outgoing",
    start: 0,
    end: 0.08,
  },
  {
    property: "scale",
    from: 1,
    to: 2.1,
    easing: "easeIn",
    target: "outgoing",
    start: 0.08,
    end: 0.42,
    param: "intensity",
  },
  {
    property: "opacity",
    from: 1,
    to: 1,
    target: "outgoing",
    start: 0,
    end: 0.42,
  },
  {
    property: "opacity",
    from: 0,
    to: 0,
    target: "incoming",
    start: 0,
    end: 0.42,
  },
  // Peak hand-off: B appears at full zoom, then both settle as B zooms out.
  {
    property: "opacity",
    from: 1,
    to: 0,
    easing: "easeOut",
    target: "outgoing",
    start: 0.42,
    end: 0.55,
  },
  {
    property: "opacity",
    from: 0,
    to: 1,
    easing: "easeIn",
    target: "incoming",
    start: 0.42,
    end: 0.55,
  },
  {
    property: "scale",
    from: 2.1,
    to: 2.1,
    target: "outgoing",
    start: 0.42,
    end: 0.55,
    param: "intensity",
  },
  {
    property: "scale",
    from: 2.1,
    to: 2.1,
    target: "incoming",
    start: 0.42,
    end: 0.55,
    param: "intensity",
  },
  {
    property: "scale",
    from: 2.1,
    to: 1,
    easing: "easeOut",
    target: "incoming",
    start: 0.55,
    end: 1,
    param: "intensity",
  },
  {
    property: "opacity",
    from: 1,
    to: 1,
    target: "incoming",
    start: 0.55,
    end: 1,
  },
];

const flashLayers: TransitionLayerDto[] = [
  ...opacityCross,
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

function slideLayers(
  axis: "translateX" | "translateY",
  dir: 1 | -1,
): TransitionLayerDto[] {
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
    ...opacityCross.map((l) => ({ ...l, easing: "linear" as const })),
  ];
}

function pushLayers(
  axis: "translateX" | "translateY",
  dir: 1 | -1,
): TransitionLayerDto[] {
  // Incoming covers outgoing (push).
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
  ];
}

// —— Catalog aligned to docs/transitions-spec.md ——

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
    layers: opacityCross,
  }),
  xfade("dissolve", "Cross Dissolve", "#A78BFA", "dissolve", {
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
  xfade("fadeblack", "Dip To Black", "#1F2937", "fadeblack", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "outgoing",
        start: 0,
        end: 0.5,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        start: 0.5,
        end: 1,
      },
      {
        property: "brightness",
        from: 0,
        to: -1,
        target: "both",
        start: 0,
        end: 0.5,
      },
      {
        property: "brightness",
        from: -1,
        to: 0,
        target: "both",
        start: 0.5,
        end: 1,
      },
    ],
  }),
  xfade("fadewhite", "Dip To White", "#E5E7EB", "fadewhite", {
    category: "basic",
    renderer: "primitive",
    layers: [
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "outgoing",
        start: 0,
        end: 0.5,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        start: 0.5,
        end: 1,
      },
      {
        property: "brightness",
        from: 0,
        to: 1,
        target: "both",
        start: 0,
        end: 0.5,
      },
      {
        property: "brightness",
        from: 1,
        to: 0,
        target: "both",
        start: 0.5,
        end: 1,
      },
    ],
  }),
];

const MOTION: TransitionItemDto[] = [
  xfade("slideleft", "Slide Left", "#FBBF24", "slideleft", {
    category: "motion",
    renderer: "primitive",
    layers: slideLayers("translateX", 1),
  }),
  xfade("slideright", "Slide Right", "#F59E0B", "slideright", {
    category: "motion",
    renderer: "primitive",
    layers: slideLayers("translateX", -1),
  }),
  xfade("slideup", "Slide Up", "#FCD34D", "slideup", {
    category: "motion",
    renderer: "primitive",
    layers: slideLayers("translateY", 1),
  }),
  xfade("slidedown", "Slide Down", "#D97706", "slidedown", {
    category: "motion",
    renderer: "primitive",
    layers: slideLayers("translateY", -1),
  }),
  xfade("pushleft", "Push Left", "#34D399", "coverleft", {
    category: "motion",
    renderer: "primitive",
    layers: pushLayers("translateX", 1),
  }),
  xfade("pushright", "Push Right", "#10B981", "coverright", {
    category: "motion",
    renderer: "primitive",
    layers: pushLayers("translateX", -1),
  }),
  xfade("pushup", "Push Up", "#6EE7B7", "coverup", {
    category: "motion",
    renderer: "primitive",
    layers: pushLayers("translateY", 1),
  }),
  xfade("pushdown", "Push Down", "#059669", "coverdown", {
    category: "motion",
    renderer: "primitive",
    layers: pushLayers("translateY", -1),
  }),
  xfade("swap", "Swap", "#A3E635", "slideleft", {
    category: "motion",
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
  xfade("doorway", "Doorway", "#84CC16", "horzopen", {
    category: "motion",
    renderer: "primitive",
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.35,
        easing: "easeIn",
        target: "outgoing",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "outgoing",
        start: 0.35,
        end: 0.75,
      },
      {
        property: "scale",
        from: 0.85,
        to: 1,
        easing: "easeOut",
        target: "incoming",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        start: 0.25,
        end: 0.7,
      },
    ],
  }),
  xfade("spinin", "Spin In", "#65A30D", "circleopen", {
    category: "motion",
    renderer: "primitive",
    layers: [
      {
        property: "rotation",
        from: -0.35,
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
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        start: 0,
        end: 0.55,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "outgoing",
        start: 0.35,
        end: 0.75,
      },
    ],
  }),
  xfade("spinout", "Spin Out", "#4D7C0F", "circleclose", {
    category: "motion",
    renderer: "primitive",
    layers: [
      {
        property: "rotation",
        from: 0,
        to: 0.35,
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
        property: "opacity",
        from: 0,
        to: 1,
        target: "incoming",
        start: 0.3,
        end: 0.8,
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
  xfade("circleopen", "Circle Open", "#F472B6", "circleopen", {
    category: "wipe",
    defaultDurationMs: 600,
  }),
  xfade("circleclose", "Circle Close", "#EC4899", "circleclose", {
    category: "wipe",
    defaultDurationMs: 600,
  }),
  xfade("radial", "Radial Wipe", "#FB7185", "radial", { category: "wipe" }),
  xfade("pagecurl", "Page Curl", "#F9A8D4", "diagtr", {
    category: "wipe",
    renderer: "primitive",
    layers: [
      {
        property: "translateX",
        from: 0,
        to: 0.35,
        easing: "easeIn",
        target: "outgoing",
      },
      {
        property: "translateY",
        from: 0,
        to: -0.2,
        easing: "easeIn",
        target: "outgoing",
      },
      {
        property: "rotation",
        from: 0,
        to: -0.08,
        target: "outgoing",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "outgoing",
        start: 0.35,
        end: 0.9,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "incoming",
        start: 0.2,
        end: 0.65,
      },
    ],
  }),
];

const ZOOM: TransitionItemDto[] = [
  xfade("zoomin", "Zoom In", "#F472B6", "zoomin", {
    category: "zoom",
    renderer: "primitive",
    version: 4,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.45,
        easing: "easeIn",
        target: "outgoing",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "outgoing",
        start: 0.35,
        end: 0.85,
      },
      {
        property: "scale",
        from: 1.45,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        start: 0.15,
        end: 0.65,
      },
    ],
  }),
  xfade("zoomout", "Zoom Out", "#FB7185", "squeezev", {
    category: "zoom",
    renderer: "primitive",
    version: 2,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: [
      {
        property: "scale",
        from: 1,
        to: 0.65,
        easing: "easeIn",
        target: "outgoing",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        easing: "easeIn",
        target: "outgoing",
        start: 0.3,
        end: 0.8,
      },
      {
        property: "scale",
        from: 0.65,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        param: "intensity",
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "incoming",
        start: 0.2,
        end: 0.7,
      },
    ],
  }),
  xfade("crosszoom", "Cross Zoom", "#E879F9", "zoomin", {
    category: "zoom",
    renderer: "primitive",
    version: 2,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.3,
        easing: "easeIn",
        target: "outgoing",
        param: "intensity",
      },
      {
        property: "scale",
        from: 1.3,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        param: "intensity",
      },
      ...opacityCross,
    ],
  }),
  xfade("cursorzoom", "Cursor Zoom", "#DB2777", "zoomin", {
    category: "zoom",
    renderer: "primitive",
    version: 1,
    defaultDurationMs: 2000,
    minDurationMs: 100,
    maxDurationMs: 3300,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: cursorZoomLayers,
  }),
  xfade("zoomblur", "Zoom Blur", "#C084FC", "hblur", {
    category: "zoom",
    renderer: "primitive",
    version: 2,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.35,
        target: "outgoing",
        param: "intensity",
      },
      {
        property: "scale",
        from: 1.35,
        to: 1,
        target: "incoming",
        param: "intensity",
      },
      {
        property: "blur",
        from: 0,
        to: 12,
        target: "both",
        start: 0,
        end: 0.5,
        param: "intensity",
      },
      {
        property: "blur",
        from: 12,
        to: 0,
        target: "both",
        start: 0.5,
        end: 1,
        param: "intensity",
      },
      ...opacityCross,
    ],
  }),
  xfade("crossblur", "Cross Blur", "#A855F7", "hblur", {
    category: "zoom",
    renderer: "primitive",
    version: 1,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: [
      {
        property: "blur",
        from: 0,
        to: 14,
        target: "outgoing",
        start: 0,
        end: 0.55,
        param: "intensity",
      },
      {
        property: "blur",
        from: 14,
        to: 0,
        target: "incoming",
        start: 0.45,
        end: 1,
        param: "intensity",
      },
      ...opacityCross,
    ],
  }),
];

const EFFECT: TransitionItemDto[] = [
  xfade("flash", "Flash", "#FDE68A", "fadewhite", {
    category: "effect",
    defaultDurationMs: 250,
    minDurationMs: 80,
    maxDurationMs: 800,
    parameters: intensityParam,
    controls: [intensityControl],
    layers: flashLayers,
    renderer: "primitive",
    version: 2,
  }),
  xfade("mosaic", "Mosaic", "#FACC15", "pixelize", {
    category: "effect",
    renderer: "primitive",
    layers: [
      {
        property: "scale",
        from: 1,
        to: 0.2,
        easing: "easeIn",
        target: "outgoing",
        start: 0,
        end: 0.5,
      },
      {
        property: "blur",
        from: 0,
        to: 8,
        target: "outgoing",
        start: 0,
        end: 0.5,
      },
      {
        property: "opacity",
        from: 1,
        to: 0,
        target: "outgoing",
        start: 0.35,
        end: 0.6,
      },
      {
        property: "scale",
        from: 0.2,
        to: 1,
        easing: "easeOut",
        target: "incoming",
        start: 0.5,
        end: 1,
      },
      {
        property: "blur",
        from: 8,
        to: 0,
        target: "incoming",
        start: 0.5,
        end: 1,
      },
      {
        property: "opacity",
        from: 0,
        to: 1,
        target: "incoming",
        start: 0.4,
        end: 0.65,
      },
    ],
  }),
  xfade("ripple", "Ripple", "#38BDF8", "dissolve", {
    category: "effect",
    renderer: "primitive",
    layers: [
      {
        property: "scale",
        from: 1,
        to: 1.12,
        easing: "easeOut",
        target: "outgoing",
        start: 0,
        end: 0.5,
      },
      {
        property: "scale",
        from: 1.12,
        to: 1,
        easing: "easeIn",
        target: "outgoing",
        start: 0.5,
        end: 1,
      },
      {
        property: "blur",
        from: 0,
        to: 6,
        target: "both",
        start: 0,
        end: 0.5,
      },
      {
        property: "blur",
        from: 6,
        to: 0,
        target: "both",
        start: 0.5,
        end: 1,
      },
      ...opacityCross,
    ],
  }),
];

const TRENDING: TransitionItemDto[] = [
  BASIC.find((i) => i.id === "fade")!,
  ZOOM.find((i) => i.id === "cursorzoom")!,
  EFFECT.find((i) => i.id === "flash")!,
  MOTION.find((i) => i.id === "pushleft")!,
  ZOOM.find((i) => i.id === "crosszoom")!,
  MOTION.find((i) => i.id === "slideleft")!,
].map((item) => ({ ...item, category: "trending" }));

function uniqueItems(groups: TransitionItemDto[][]): TransitionItemDto[] {
  const byId = new Map<string, TransitionItemDto>();
  for (const group of groups) {
    for (const item of group) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

/** Catalog aligned to docs/transitions-spec.md */
export const TRANSITION_CATALOG: TransitionCatalogDto = {
  version: 7,
  baseUrl: "",
  categories: [
    { id: "trending", title: "Trending", items: TRENDING },
    { id: "basic", title: "Basic", items: BASIC },
    { id: "motion", title: "Motion", items: MOTION },
    { id: "wipe", title: "Wipe", items: WIPE },
    { id: "zoom", title: "Zoom", items: ZOOM },
    { id: "effect", title: "Effect", items: EFFECT },
  ],
  items: uniqueItems([BASIC, MOTION, WIPE, ZOOM, EFFECT]),
};

export function buildTransitionCatalog(): TransitionCatalogDto {
  return TRANSITION_CATALOG;
}

export { corsHeaders };

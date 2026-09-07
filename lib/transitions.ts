import { corsHeaders } from "@/lib/music";

export type TransitionEffectType = "cut" | "xfade" | "asset";

export type TransitionItemDto = {
  id: string;
  title: string;
  effectType: TransitionEffectType;
  /** FFmpeg xfade transition name; empty for hard cut / asset-only. */
  ffmpegName: string;
  defaultDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  /** Optional preview accent for the picker tile fallback. */
  accent: string;
  premium?: boolean;
  /** Relative to catalog baseUrl, or absolute. */
  thumbnailUrl?: string;
  previewUrl?: string;
  assetUrl?: string;
  downloadSizeBytes?: number;
  itemVersion?: number;
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
  /** Flat list for backward-compatible clients / merge. */
  items: TransitionItemDto[];
};

function xfade(
  id: string,
  title: string,
  accent: string,
  opts?: Partial<
    Pick<
      TransitionItemDto,
      "defaultDurationMs" | "minDurationMs" | "maxDurationMs" | "premium"
    >
  >,
): TransitionItemDto {
  return {
    id,
    title,
    effectType: "xfade",
    ffmpegName: id,
    defaultDurationMs: opts?.defaultDurationMs ?? 500,
    minDurationMs: opts?.minDurationMs ?? 100,
    maxDurationMs: opts?.maxDurationMs ?? 3000,
    accent,
    premium: opts?.premium ?? false,
    thumbnailUrl: `transitions/thumbs/${id}.webp`,
    itemVersion: 1,
  };
}

const BASIC_ITEMS: TransitionItemDto[] = [
  {
    id: "none",
    title: "None",
    effectType: "cut",
    ffmpegName: "",
    defaultDurationMs: 0,
    minDurationMs: 0,
    maxDurationMs: 0,
    accent: "#6B7280",
    premium: false,
    itemVersion: 1,
  },
  xfade("fade", "Fade", "#60A5FA"),
  xfade("dissolve", "Dissolve", "#A78BFA"),
  xfade("wipeleft", "Wipe left", "#34D399"),
  xfade("wiperight", "Wipe right", "#2DD4BF"),
  xfade("slideleft", "Slide left", "#FBBF24"),
  xfade("slideright", "Slide right", "#F59E0B"),
  xfade("circleopen", "Circle open", "#F472B6", {
    defaultDurationMs: 600,
  }),
  xfade("circleclose", "Circle close", "#FB7185", {
    defaultDurationMs: 600,
  }),
  xfade("pixelize", "Pixelize", "#94A3B8"),
];

const POPULAR_ITEMS: TransitionItemDto[] = [
  xfade("fade", "Fade", "#60A5FA"),
  xfade("dissolve", "Dissolve", "#A78BFA"),
  xfade("circleopen", "Circle open", "#F472B6", {
    defaultDurationMs: 600,
  }),
  xfade("slideleft", "Slide left", "#FBBF24"),
  xfade("fadeblack", "Fade black", "#1F2937"),
  xfade("fadewhite", "Fade white", "#E5E7EB"),
];

/** Built-in CapCut-like set; clients may merge with offline fallbacks. */
export const TRANSITION_CATALOG: TransitionCatalogDto = {
  version: 2,
  baseUrl: "",
  categories: [
    { id: "popular", title: "Popular", items: POPULAR_ITEMS },
    { id: "basic", title: "Basic", items: BASIC_ITEMS },
  ],
  // Flat unique list (basic order + popular-only extras).
  items: (() => {
    const byId = new Map<string, TransitionItemDto>();
    for (const item of [...BASIC_ITEMS, ...POPULAR_ITEMS]) {
      byId.set(item.id, item);
    }
    return Array.from(byId.values());
  })(),
};

export function buildTransitionCatalog(): TransitionCatalogDto {
  return TRANSITION_CATALOG;
}

export { corsHeaders };

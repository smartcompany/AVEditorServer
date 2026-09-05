import { corsHeaders } from "@/lib/music";

export type TransitionItemDto = {
  id: string;
  title: string;
  /** FFmpeg xfade transition name, or empty for hard cut. */
  ffmpegName: string;
  defaultDurationMs: number;
  /** Optional preview accent for the picker chip. */
  accent: string;
};

export type TransitionCatalogDto = {
  version: number;
  items: TransitionItemDto[];
};

/** Built-in CapCut-like set; clients may merge with offline fallbacks. */
export const TRANSITION_CATALOG: TransitionCatalogDto = {
  version: 1,
  items: [
    {
      id: "none",
      title: "None",
      ffmpegName: "",
      defaultDurationMs: 0,
      accent: "#6B7280",
    },
    {
      id: "fade",
      title: "Fade",
      ffmpegName: "fade",
      defaultDurationMs: 500,
      accent: "#60A5FA",
    },
    {
      id: "dissolve",
      title: "Dissolve",
      ffmpegName: "dissolve",
      defaultDurationMs: 500,
      accent: "#A78BFA",
    },
    {
      id: "wipeleft",
      title: "Wipe left",
      ffmpegName: "wipeleft",
      defaultDurationMs: 500,
      accent: "#34D399",
    },
    {
      id: "wiperight",
      title: "Wipe right",
      ffmpegName: "wiperight",
      defaultDurationMs: 500,
      accent: "#2DD4BF",
    },
    {
      id: "slideleft",
      title: "Slide left",
      ffmpegName: "slideleft",
      defaultDurationMs: 500,
      accent: "#FBBF24",
    },
    {
      id: "slideright",
      title: "Slide right",
      ffmpegName: "slideright",
      defaultDurationMs: 500,
      accent: "#F59E0B",
    },
    {
      id: "circleopen",
      title: "Circle open",
      ffmpegName: "circleopen",
      defaultDurationMs: 600,
      accent: "#F472B6",
    },
    {
      id: "circleclose",
      title: "Circle close",
      ffmpegName: "circleclose",
      defaultDurationMs: 600,
      accent: "#FB7185",
    },
    {
      id: "pixelize",
      title: "Pixelize",
      ffmpegName: "pixelize",
      defaultDurationMs: 500,
      accent: "#94A3B8",
    },
  ],
};

export function buildTransitionCatalog(): TransitionCatalogDto {
  return TRANSITION_CATALOG;
}

export { corsHeaders };

/**
 * Server-driven timeline background templates (prologue / epilogue stills).
 * Images live under /public/backgrounds and are mirrored into the Flutter bundle.
 */

export type BackgroundCatalogItem = {
  id: string;
  title: string;
  /** Relative to site origin, e.g. backgrounds/stars.png */
  imageUrl: string;
  previewUrl?: string;
  /** Hold length when inserted as an image clip. */
  defaultDurationMs: number;
};

export type BackgroundCatalog = {
  version: number;
  baseUrl: string;
  items: BackgroundCatalogItem[];
};

const DEFAULT_MS = 5000;

function bg(
  id: string,
  title: string,
  file: string,
  durationMs = DEFAULT_MS,
): BackgroundCatalogItem {
  const imageUrl = `backgrounds/${file}`;
  return {
    id,
    title,
    imageUrl,
    previewUrl: imageUrl,
    defaultDurationMs: durationMs,
  };
}

/** Seed list — original procedural art (not iMovie assets). */
export const BACKGROUND_SEED_ITEMS: BackgroundCatalogItem[] = [
  bg("bg_curtain", "커튼", "curtain.png"),
  bg("bg_organic", "오가닉", "organic.png"),
  bg("bg_blob", "얼룩", "blob.png"),
  bg("bg_underwater", "수중", "underwater.png"),
  bg("bg_gradient", "그라디언트", "gradient.png"),
  bg("bg_industrial", "공업용", "industrial.png"),
  bg("bg_pinstripe", "핀스트라이프", "pinstripe.png"),
  bg("bg_stars", "별", "stars.png"),
  bg("bg_retro", "복고풍", "retro.png"),
  bg("bg_paper", "종이", "paper.png"),
  bg("bg_silk_orange", "실크-오렌지", "silk_orange.png"),
  bg("bg_silk_beige", "실크-베이지", "silk_beige.png"),
  bg("bg_abstract", "추상", "abstract.png"),
  bg("bg_checker", "체커", "checker.png"),
  bg("bg_circles", "원형", "circles.png"),
  bg("bg_cubes", "큐브", "cubes.png"),
  bg("bg_diagonal", "대각선", "diagonal.png"),
  bg("bg_dots", "점", "dots.png"),
  bg("bg_mosaic", "모자이크", "mosaic.png"),
  bg("bg_triangles", "삼각형", "triangles.png"),
];

export const BACKGROUND_CATALOG_SEED_VERSION = 1;

export function buildBackgroundCatalog(baseUrl: string): BackgroundCatalog {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return {
    version: BACKGROUND_CATALOG_SEED_VERSION,
    baseUrl: normalized,
    items: BACKGROUND_SEED_ITEMS,
  };
}

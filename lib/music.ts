const MIXKIT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const PIXABAY_LICENSE = "https://pixabay.com/service/license-summary/";
const MIXKIT_LICENSE = "https://mixkit.co/license/#musicFree";

export const CATALOG_NOTE =
  "Free for commercial use. Attribution not required (Pixabay / Mixkit).";

export type MusicProvider = "pixabay" | "mixkit";

export type MusicTrackDto = {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  previewUrl: string;
  imageUrl: string;
  downloadAllowed: boolean;
  licenseUrl: string | null;
  downloadUrl: string;
  provider: MusicProvider;
};

export type AutocompleteSuggestion = {
  text: string;
  kind: "track" | "artist" | "album" | "tag";
};

export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function pixabayApiKey(): string {
  return (process.env.PIXABAY_API_KEY ?? "").trim();
}

export function isPixabayConfigured(): boolean {
  return pixabayApiKey().length > 0;
}

function mixkitMp3(id: string): string {
  return `https://assets.mixkit.co/music/${id}/${id}.mp3`;
}

function mixkitTrack(
  id: string,
  title: string,
  artist: string,
  durationSec = 0,
): MusicTrackDto {
  const url = mixkitMp3(id);
  return {
    id: `mixkit-${id}`,
    title,
    artist,
    durationSec,
    previewUrl: url,
    imageUrl: "",
    downloadAllowed: true,
    licenseUrl: MIXKIT_LICENSE,
    downloadUrl: url,
    provider: "mixkit",
  };
}

/** Last-resort featured list if Mixkit HTML is blocked. */
const MIXKIT_FALLBACK: MusicTrackDto[] = [
  mixkitTrack("738", "Hip Hop 02", "Lily J"),
  mixkitTrack("580", "Sun and His Daughter", "Eugenio Mininni"),
  mixkitTrack("132", "Hazy After Hours", "Alejandro Magaña (A. M.)"),
  mixkitTrack("130", "Tech House vibes", "Alejandro Magaña (A. M.)"),
  mixkitTrack("897", "A Very Happy Christmas", "Michael Ramir C."),
  mixkitTrack("32", "Driving Ambition", "Ahjay Stelino"),
  mixkitTrack("614", "Silent Descent", "Eugenio Mininni"),
  mixkitTrack("493", "Beautiful Dream", "Diego Nava"),
  mixkitTrack("623", "Deep Urban", "Eugenio Mininni"),
  mixkitTrack("443", "Serene View", "Arulo"),
  mixkitTrack("127", "Valley Sunset", "Alejandro Magaña (A. M.)"),
  mixkitTrack("657", "Wedding 01", "Francisco Alvear"),
  mixkitTrack("400", "C.B.P.D", "Arulo"),
  mixkitTrack("587", "Discover", "Eugenio Mininni"),
  mixkitTrack("371", "Cat Walk", "Arulo"),
  mixkitTrack("51", "Sports Highlights", "Ahjay Stelino"),
  mixkitTrack("695", "Pop 05", "Grigoriy Nuzhny"),
  mixkitTrack("659", "Romantic", "Francisco Alvear"),
];

const MIXKIT_GENRES = [
  "Ambient",
  "Children",
  "Classical",
  "Cinematic",
  "Corporate",
  "Country",
  "Drum & Bass",
  "Funk",
  "Happy",
  "Hip Hop",
  "Holiday",
  "Jazz",
  "Pop",
  "Rock",
  "Sad",
  "Trap",
];

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMixkitHtml(html: string): MusicTrackDto[] {
  const ids = [...html.matchAll(/data-audio-player-item-id-value="(\d+)"/g)].map(
    (m) => m[1],
  );
  const titles = [
    ...html.matchAll(/item-grid-card__title">\s*([^<]+)/g),
  ].map((m) => decodeHtml(m[1]));
  const authors = [
    ...html.matchAll(/item-grid-music-preview__author">\s*(?:by\s+)?([^<]+)/g),
  ].map((m) => decodeHtml(m[1]));

  const n = Math.min(ids.length, titles.length, authors.length);
  const out: MusicTrackDto[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const id = ids[i];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(mixkitTrack(id, titles[i] || "Untitled", authors[i] || "Mixkit"));
  }
  return out;
}

async function fetchMixkitPage(url: string): Promise<MusicTrackDto[]> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": MIXKIT_UA,
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`mixkit_upstream_${response.status}`);
  }
  return parseMixkitHtml(await response.text());
}

async function searchMixkit(
  query: string,
  limit: number,
  offset: number,
): Promise<MusicTrackDto[]> {
  const slug = slugify(query);
  const urls = slug
    ? [
        `https://mixkit.co/free-stock-music/tag/${encodeURIComponent(slug)}/`,
        `https://mixkit.co/free-stock-music/mood/${encodeURIComponent(slug)}/`,
        `https://mixkit.co/free-stock-music/instrument/${encodeURIComponent(slug)}/`,
      ]
    : ["https://mixkit.co/free-stock-music/"];

  let lastError: unknown;
  for (const url of urls) {
    try {
      const tracks = await fetchMixkitPage(url);
      if (tracks.length > 0) {
        return tracks.slice(offset, offset + limit);
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (!slug) {
    return MIXKIT_FALLBACK.slice(offset, offset + limit);
  }
  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error("mixkit_search_failed");
  }
  return [];
}

function audioUrlFromPixabayHit(hit: Record<string, unknown>): string {
  const audios = hit.audios as
    | Record<string, { url?: string } | undefined>
    | undefined;
  if (audios) {
    return (
      audios.medium?.url ||
      audios.large?.url ||
      audios.small?.url ||
      audios.tiny?.url ||
      ""
    );
  }
  const nested = hit.audio as Record<string, unknown> | string | undefined;
  if (nested && typeof nested === "object") {
    return String(nested.url ?? nested.previewURL ?? "");
  }
  return String(
    hit.previewURL ??
      hit.previewUrl ??
      hit.downloadURL ??
      hit.audio ??
      hit.url ??
      "",
  );
}

function parsePixabayHit(hit: Record<string, unknown>): MusicTrackDto | null {
  const rawId = String(hit.id ?? "").trim();
  const url = audioUrlFromPixabayHit(hit);
  if (!rawId || !url.startsWith("http")) return null;

  const tags = String(hit.tags ?? "");
  const title = String(
    hit.name ?? hit.title ?? tags.split(",")[0] ?? "Untitled",
  ).trim();
  const durationRaw = Number(hit.duration ?? hit.durationSec ?? 0);
  const durationSec =
    durationRaw > 10_000 ? Math.round(durationRaw / 1000) : Math.round(durationRaw);

  return {
    id: `pixabay-${rawId}`,
    title: title || "Untitled",
    artist: String(hit.user ?? hit.userName ?? "Pixabay"),
    durationSec: Number.isFinite(durationSec) ? durationSec : 0,
    previewUrl: url,
    imageUrl: String(hit.userImageURL ?? hit.imageURL ?? ""),
    downloadAllowed: true,
    licenseUrl: PIXABAY_LICENSE,
    downloadUrl: url,
    provider: "pixabay",
  };
}

async function searchPixabay(
  query: string,
  limit: number,
  offset: number,
): Promise<MusicTrackDto[]> {
  const key = pixabayApiKey();
  if (!key) {
    throw new Error("pixabay_not_configured");
  }

  const page = Math.floor(offset / Math.max(limit, 1)) + 1;
  const url = new URL("https://pixabay.com/api/audio/");
  url.searchParams.set("key", key);
  if (query.trim()) url.searchParams.set("q", query.trim());
  url.searchParams.set("order", "popular");
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(Math.min(Math.max(limit, 3), 200)));

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`pixabay_upstream_${response.status}`);
  }

  const body = (await response.json()) as {
    hits?: Record<string, unknown>[];
  };
  return (body.hits ?? [])
    .map(parsePixabayHit)
    .filter((track): track is MusicTrackDto => track !== null);
}

export async function searchTracks(
  query: string,
  limit = 20,
  offset = 0,
): Promise<{ tracks: MusicTrackDto[]; provider: MusicProvider }> {
  if (isPixabayConfigured()) {
    try {
      const tracks = await searchPixabay(query, limit, offset);
      if (tracks.length > 0) {
        return { tracks, provider: "pixabay" };
      }
    } catch {
      // Mixkit has the same license profile and does not need a key.
    }
  }

  const tracks = await searchMixkit(query, limit, offset);
  return { tracks, provider: "mixkit" };
}

export async function featuredTracks(
  limit = 24,
): Promise<{ tracks: MusicTrackDto[]; provider: MusicProvider }> {
  return searchTracks("", limit, 0);
}

export async function autocompleteSuggestions(
  prefix: string,
  limit = 10,
): Promise<AutocompleteSuggestion[]> {
  const trimmed = prefix.trim();
  const out: AutocompleteSuggestion[] = [];
  const seen = new Set<string>();

  const push = (text: string, kind: AutocompleteSuggestion["kind"]) => {
    const key = text.trim().toLowerCase();
    if (!key || seen.has(key) || out.length >= limit) return;
    seen.add(key);
    out.push({ text: text.trim(), kind });
  };

  if (trimmed.length >= 2) {
    push(trimmed, "track");
  }

  for (const genre of MIXKIT_GENRES) {
    if (!trimmed || genre.toLowerCase().includes(trimmed.toLowerCase())) {
      push(genre, "tag");
    }
  }

  return out.slice(0, limit);
}

export function mixkitDownloadUrl(trackId: string): string | null {
  const match = /^mixkit-(\d+)$/.exec(trackId);
  if (!match) return null;
  return mixkitMp3(match[1]);
}

export async function pixabayDownloadUrl(trackId: string): Promise<string | null> {
  const match = /^pixabay-(\d+)$/.exec(trackId);
  if (!match || !isPixabayConfigured()) return null;

  const byId = new URL("https://pixabay.com/api/audio/");
  byId.searchParams.set("key", pixabayApiKey());
  byId.searchParams.set("id", match[1]);
  const response = await fetch(byId.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { hits?: Record<string, unknown>[] };
  const parsed = (body.hits ?? [])
    .map(parsePixabayHit)
    .find((t) => t?.id === `pixabay-${match[1]}`);
  return parsed?.downloadUrl ?? null;
}

const MIXKIT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const PIXABAY_LICENSE = "https://pixabay.com/service/license-summary/";
const MIXKIT_MUSIC_LICENSE = "https://mixkit.co/license/#musicFree";
const MIXKIT_SFX_LICENSE = "https://mixkit.co/license/#sfxFree";

export const CATALOG_NOTE =
  "Free for commercial use. Attribution not required (Pixabay / Mixkit).";

export type MusicProvider = "pixabay" | "mixkit";
export type CatalogKind = "music" | "sfx";

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
  kind: CatalogKind;
};

export type AutocompleteSuggestion = {
  text: string;
  kind: "track" | "artist" | "album" | "tag" | "genre";
};

export type CatalogGenre = {
  id: string;
  /** English Mixkit slug / search key. */
  query: string;
  /** Labels for autocomplete / API consumers. */
  labels: string[];
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

function mixkitSfxPreview(id: string): string {
  return `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;
}

function mixkitMusicTrack(
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
    licenseUrl: MIXKIT_MUSIC_LICENSE,
    downloadUrl: url,
    provider: "mixkit",
    kind: "music",
  };
}

function mixkitSfxTrack(
  id: string,
  title: string,
  durationSec = 0,
): MusicTrackDto {
  const url = mixkitSfxPreview(id);
  return {
    id: `mixkit-sfx-${id}`,
    title,
    artist: "Mixkit",
    durationSec,
    previewUrl: url,
    imageUrl: "",
    downloadAllowed: true,
    licenseUrl: MIXKIT_SFX_LICENSE,
    downloadUrl: url,
    provider: "mixkit",
    kind: "sfx",
  };
}

/** Last-resort featured list if Mixkit HTML is blocked. */
const MIXKIT_MUSIC_FALLBACK: MusicTrackDto[] = [
  mixkitMusicTrack("738", "Hip Hop 02", "Lily J"),
  mixkitMusicTrack("580", "Sun and His Daughter", "Eugenio Mininni"),
  mixkitMusicTrack("132", "Hazy After Hours", "Alejandro Magaña (A. M.)"),
  mixkitMusicTrack("130", "Tech House vibes", "Alejandro Magaña (A. M.)"),
  mixkitMusicTrack("897", "A Very Happy Christmas", "Michael Ramir C."),
  mixkitMusicTrack("32", "Driving Ambition", "Ahjay Stelino"),
  mixkitMusicTrack("614", "Silent Descent", "Eugenio Mininni"),
  mixkitMusicTrack("493", "Beautiful Dream", "Diego Nava"),
  mixkitMusicTrack("623", "Deep Urban", "Eugenio Mininni"),
  mixkitMusicTrack("443", "Serene View", "Arulo"),
  mixkitMusicTrack("127", "Valley Sunset", "Alejandro Magaña (A. M.)"),
  mixkitMusicTrack("657", "Wedding 01", "Francisco Alvear"),
  mixkitMusicTrack("400", "C.B.P.D", "Arulo"),
  mixkitMusicTrack("587", "Discover", "Eugenio Mininni"),
  mixkitMusicTrack("371", "Cat Walk", "Arulo"),
  mixkitMusicTrack("51", "Sports Highlights", "Ahjay Stelino"),
  mixkitMusicTrack("695", "Pop 05", "Grigoriy Nuzhny"),
  mixkitMusicTrack("659", "Romantic", "Francisco Alvear"),
  mixkitMusicTrack("839", "Tears of Joy", "Michael Ramir C."),
  mixkitMusicTrack("5", "Feeling Happy", "Ahjay Stelino"),
];

const MIXKIT_SFX_FALLBACK: MusicTrackDto[] = [
  mixkitSfxTrack("1489", "Air woosh", 2),
  mixkitSfxTrack("1492", "Fast whoosh", 1),
  mixkitSfxTrack("1714", "Whoosh", 1),
  mixkitSfxTrack("1491", "Swoosh", 1),
  mixkitSfxTrack("1486", "Wind whoosh", 2),
  mixkitSfxTrack("2350", "Cinematic hit", 2),
  mixkitSfxTrack("3005", "Impact", 1),
  mixkitSfxTrack("787", "Notification", 1),
  mixkitSfxTrack("2623", "Glitch", 1),
  mixkitSfxTrack("2918", "Transition swipe", 1),
  mixkitSfxTrack("2408", "Click", 1),
  mixkitSfxTrack("2596", "Pop", 1),
];

/** CapCut-style mood / use filters for music. */
export const MUSIC_GENRES: CatalogGenre[] = [
  {
    id: "travel",
    query: "travel",
    labels: ["Travel", "여행", "旅行", "旅行"],
  },
  {
    id: "beauty",
    query: "beauty",
    labels: ["Beauty", "뷰티", "ビューティー", "美妆"],
  },
  {
    id: "fashion",
    query: "fashion",
    labels: ["Fashion", "패션", "ファッション", "时尚"],
  },
  {
    id: "happy",
    query: "happy",
    labels: ["Happy", "신나는", "アップビート", "欢快", "Upbeat"],
  },
  {
    id: "energetic",
    query: "energetic",
    labels: ["Energetic", "에너지", "エネルギッシュ", "动感"],
  },
  {
    id: "chill",
    query: "chillout",
    labels: ["Chill", "잔잔한", "チル", "轻松"],
  },
  {
    id: "cinematic",
    query: "cinematic",
    labels: ["Cinematic", "시네마틱", "シネマティック", "电影感"],
  },
  {
    id: "romantic",
    query: "romantic",
    labels: ["Romantic", "로맨틱", "ロマンチック", "浪漫"],
  },
  {
    id: "sports",
    query: "sports",
    labels: ["Sports", "스포츠", "スポーツ", "运动"],
  },
  {
    id: "nature",
    query: "nature",
    labels: ["Nature", "자연", "自然", "自然"],
  },
  {
    id: "cooking",
    query: "cooking",
    labels: ["Cooking", "요리", "料理", "美食"],
  },
  {
    id: "corporate",
    query: "corporate",
    labels: ["Corporate", "비즈니스", "コーポレート", "商务"],
  },
  {
    id: "hip-hop",
    query: "hip-hop",
    labels: ["Hip Hop", "힙합", "ヒップホップ", "嘻哈"],
  },
  {
    id: "pop",
    query: "pop",
    labels: ["Pop", "팝", "ポップ", "流行"],
  },
  {
    id: "children",
    query: "children",
    labels: ["Kids", "키즈", "キッズ", "儿童", "Children"],
  },
];

export const SFX_GENRES: CatalogGenre[] = [
  {
    id: "whoosh",
    query: "whoosh",
    labels: ["Whoosh", "우시", "ウーシュ", "嗖嗖"],
  },
  {
    id: "transition",
    query: "transition",
    labels: ["Transition", "전환", "トランジション", "转场"],
  },
  {
    id: "impact",
    query: "impact",
    labels: ["Impact", "임팩트", "インパクト", "撞击"],
  },
  {
    id: "nature",
    query: "nature",
    labels: ["Nature", "자연", "自然", "自然"],
  },
  {
    id: "cinematic",
    query: "cinematic",
    labels: ["Cinematic", "시네마틱", "シネマティック", "电影"],
  },
  {
    id: "glitch",
    query: "glitch",
    labels: ["Glitch", "글리치", "グリッチ", "故障"],
  },
  {
    id: "notification",
    query: "notification",
    labels: ["Notification", "알림", "通知", "通知"],
  },
  {
    id: "game",
    query: "game",
    labels: ["Game", "게임", "ゲーム", "游戏"],
  },
  {
    id: "technology",
    query: "technology",
    labels: ["Tech", "테크", "テック", "科技", "Technology"],
  },
  {
    id: "ui",
    query: "interface",
    labels: ["UI", "인터페이스", "UI", "界面"],
  },
];

/** Free-text / localized aliases → English Mixkit search keys. */
const QUERY_ALIASES: Record<string, string> = {
  여행: "travel",
  뷰티: "beauty",
  패션: "fashion",
  신나는: "happy",
  신남: "happy",
  업비트: "happy",
  에너지: "energetic",
  잔잔한: "chillout",
  힐링: "chillout",
  시네마틱: "cinematic",
  로맨틱: "romantic",
  스포츠: "sports",
  자연: "nature",
  요리: "cooking",
  비즈니스: "corporate",
  힙합: "hip-hop",
  팝: "pop",
  키즈: "children",
  아이들: "children",
  파티: "party",
  브이로그: "vlog",
  전환: "transition",
  임팩트: "impact",
  글리치: "glitch",
  알림: "notification",
  게임: "game",
  우시: "whoosh",
  美妆: "beauty",
  时尚: "fashion",
  欢快: "happy",
  动感: "energetic",
  轻松: "chillout",
  浪漫: "romantic",
  运动: "sports",
  美食: "cooking",
  商务: "corporate",
  嘻哈: "hip-hop",
  儿童: "children",
  转场: "transition",
  游戏: "game",
  旅行: "travel",
  ビューティー: "beauty",
  ファッション: "fashion",
  アップビート: "happy",
  チル: "chillout",
  シネマティック: "cinematic",
  ロマンチック: "romantic",
  スポーツ: "sports",
  自然: "nature",
  料理: "cooking",
  コーポレート: "corporate",
  ヒップホップ: "hip-hop",
  ポップ: "pop",
  キッズ: "children",
  トランジション: "transition",
  インパクト: "impact",
  グリッチ: "glitch",
  ウーシュ: "whoosh",
  upbeat: "happy",
  chill: "chillout",
  kids: "children",
  tech: "technology",
  ui: "interface",
  sfx: "whoosh",
};

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

function parseDurationSec(raw: string): number {
  const cleaned = raw.trim();
  const m = /^(\d+):(\d{1,2})$/.exec(cleaned);
  if (m) {
    return Number(m[1]) * 60 + Number(m[2]);
  }
  const sec = Number(cleaned);
  return Number.isFinite(sec) ? Math.round(sec) : 0;
}

/** Normalize user/genre input to Mixkit-friendly English tokens. */
export function resolveSearchQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();
  if (QUERY_ALIASES[trimmed] || QUERY_ALIASES[lower]) {
    return QUERY_ALIASES[trimmed] ?? QUERY_ALIASES[lower];
  }

  for (const genre of [...MUSIC_GENRES, ...SFX_GENRES]) {
    if (
      genre.id === lower ||
      genre.query === lower ||
      genre.labels.some((l) => l.toLowerCase() === lower)
    ) {
      return genre.query;
    }
  }

  // Keep ASCII search terms; drop pure CJK that we couldn't alias.
  const slug = slugify(trimmed);
  if (slug) return slug.replace(/-/g, " ");

  return trimmed;
}

function parseMixkitMusicHtml(html: string): MusicTrackDto[] {
  const ids = [...html.matchAll(/data-audio-player-item-id-value="(\d+)"/g)].map(
    (m) => m[1],
  );
  const types = [
    ...html.matchAll(/data-audio-player-item-type-value="([^"]+)"/g),
  ].map((m) => m[1]);
  const titles = [
    ...html.matchAll(/item-grid-card__title">\s*([^<]+)/g),
  ].map((m) => decodeHtml(m[1]));
  const authors = [
    ...html.matchAll(/item-grid-music-preview__author">\s*(?:by\s+)?([^<]+)/g),
  ].map((m) => decodeHtml(m[1]));

  const out: MusicTrackDto[] = [];
  const seen = new Set<string>();
  const n = Math.min(ids.length, titles.length);
  for (let i = 0; i < n; i++) {
    const id = ids[i];
    if (seen.has(id)) continue;
    if (types[i] && types[i] !== "music") continue;
    seen.add(id);
    out.push(
      mixkitMusicTrack(
        id,
        titles[i] || "Untitled",
        authors[i] || "Mixkit",
      ),
    );
  }
  return out;
}

function parseMixkitSfxHtml(html: string): MusicTrackDto[] {
  const ids = [...html.matchAll(/data-audio-player-item-id-value="(\d+)"/g)].map(
    (m) => m[1],
  );
  const types = [
    ...html.matchAll(/data-audio-player-item-type-value="([^"]+)"/g),
  ].map((m) => m[1]);
  const titles = [
    ...html.matchAll(/item-grid-card__title">\s*([^<]+)/g),
  ].map((m) => decodeHtml(m[1]));
  const durations = [
    ...html.matchAll(
      /item-grid-sfx-preview__meta-time"[^>]*>\s*([^<]+)/g,
    ),
  ].map((m) => parseDurationSec(decodeHtml(m[1])));

  const out: MusicTrackDto[] = [];
  const seen = new Set<string>();
  const n = Math.min(ids.length, titles.length);
  for (let i = 0; i < n; i++) {
    const id = ids[i];
    if (seen.has(id)) continue;
    if (types[i] && types[i] !== "sfx") continue;
    seen.add(id);
    out.push(mixkitSfxTrack(id, titles[i] || "Untitled", durations[i] ?? 0));
  }
  return out;
}

async function fetchHtml(url: string): Promise<string> {
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
  return response.text();
}

async function fetchMixkitMusicPage(url: string): Promise<MusicTrackDto[]> {
  return parseMixkitMusicHtml(await fetchHtml(url));
}

async function fetchMixkitSfxPage(url: string): Promise<MusicTrackDto[]> {
  return parseMixkitSfxHtml(await fetchHtml(url));
}

function musicCandidateUrls(resolved: string): string[] {
  const slug = slugify(resolved);
  if (!slug) {
    return ["https://mixkit.co/free-stock-music/"];
  }
  return [
    `https://mixkit.co/free-stock-music/tag/${encodeURIComponent(slug)}/`,
    `https://mixkit.co/free-stock-music/mood/${encodeURIComponent(slug)}/`,
    `https://mixkit.co/free-stock-music/discover/${encodeURIComponent(slug)}/`,
    `https://mixkit.co/free-stock-music/instrument/${encodeURIComponent(slug)}/`,
    `https://mixkit.co/free-stock-music/${encodeURIComponent(slug)}/`,
  ];
}

function sfxCandidateUrls(resolved: string): string[] {
  const slug = slugify(resolved);
  if (!slug) {
    return ["https://mixkit.co/free-sound-effects/"];
  }
  return [
    `https://mixkit.co/free-sound-effects/${encodeURIComponent(slug)}/`,
    `https://mixkit.co/free-sound-effects/search/?q=${encodeURIComponent(resolved)}`,
  ];
}

async function firstNonEmpty<T>(
  urls: string[],
  fetchPage: (url: string) => Promise<T[]>,
): Promise<T[]> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const items = await fetchPage(url);
      if (items.length > 0) return items;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    throw lastError instanceof Error
      ? lastError
      : new Error("mixkit_search_failed");
  }
  return [];
}

async function searchMixkitMusic(
  query: string,
  limit: number,
  offset: number,
): Promise<MusicTrackDto[]> {
  const resolved = resolveSearchQuery(query);
  const urls = musicCandidateUrls(resolved);

  try {
    const tracks = await firstNonEmpty(urls, fetchMixkitMusicPage);
    if (tracks.length > 0) {
      return tracks.slice(offset, offset + limit);
    }
  } catch (error) {
    if (!resolved) {
      return MIXKIT_MUSIC_FALLBACK.slice(offset, offset + limit);
    }
    throw error;
  }

  if (!resolved) {
    return MIXKIT_MUSIC_FALLBACK.slice(offset, offset + limit);
  }
  return [];
}

async function searchMixkitSfx(
  query: string,
  limit: number,
  offset: number,
): Promise<MusicTrackDto[]> {
  const resolved = resolveSearchQuery(query);
  const urls = sfxCandidateUrls(resolved);

  try {
    const tracks = await firstNonEmpty(urls, fetchMixkitSfxPage);
    if (tracks.length > 0) {
      return tracks.slice(offset, offset + limit);
    }
  } catch (error) {
    if (!resolved) {
      return MIXKIT_SFX_FALLBACK.slice(offset, offset + limit);
    }
    // Prefer curated fallback over empty when Mixkit blocks scraping.
    const filtered = MIXKIT_SFX_FALLBACK.filter((t) =>
      `${t.title} ${resolved}`.toLowerCase().includes(resolved.toLowerCase()) ||
      resolved.split(/\s+/).some((tok) =>
        t.title.toLowerCase().includes(tok.toLowerCase()),
      ),
    );
    if (filtered.length > 0) {
      return filtered.slice(offset, offset + limit);
    }
    throw error;
  }

  if (!resolved) {
    return MIXKIT_SFX_FALLBACK.slice(offset, offset + limit);
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
    kind: "music",
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

  const resolved = resolveSearchQuery(query);
  const page = Math.floor(offset / Math.max(limit, 1)) + 1;
  const url = new URL("https://pixabay.com/api/audio/");
  url.searchParams.set("key", key);
  if (resolved.trim()) url.searchParams.set("q", resolved.trim());
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
  kind: CatalogKind = "music",
): Promise<{ tracks: MusicTrackDto[]; provider: MusicProvider }> {
  if (kind === "sfx") {
    const tracks = await searchMixkitSfx(query, limit, offset);
    return { tracks, provider: "mixkit" };
  }

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

  const tracks = await searchMixkitMusic(query, limit, offset);
  return { tracks, provider: "mixkit" };
}

export async function featuredTracks(
  limit = 24,
  kind: CatalogKind = "music",
): Promise<{ tracks: MusicTrackDto[]; provider: MusicProvider }> {
  return searchTracks("", limit, 0, kind);
}

export function listGenres(kind: CatalogKind = "music"): CatalogGenre[] {
  return kind === "sfx" ? SFX_GENRES : MUSIC_GENRES;
}

export async function autocompleteSuggestions(
  prefix: string,
  limit = 10,
  kind: CatalogKind = "music",
): Promise<AutocompleteSuggestion[]> {
  const trimmed = prefix.trim();
  const out: AutocompleteSuggestion[] = [];
  const seen = new Set<string>();

  const push = (text: string, suggestionKind: AutocompleteSuggestion["kind"]) => {
    const key = text.trim().toLowerCase();
    if (!key || seen.has(key) || out.length >= limit) return;
    seen.add(key);
    out.push({ text: text.trim(), kind: suggestionKind });
  };

  if (trimmed.length >= 1) {
    const resolved = resolveSearchQuery(trimmed);
    if (resolved && resolved.toLowerCase() !== trimmed.toLowerCase()) {
      push(resolved, "tag");
    }
    if (trimmed.length >= 2) {
      push(trimmed, "track");
    }
  }

  const genres = listGenres(kind);
  for (const genre of genres) {
    const haystack = [genre.id, genre.query, ...genre.labels]
      .join(" ")
      .toLowerCase();
    if (!trimmed || haystack.includes(trimmed.toLowerCase())) {
      push(genre.labels[0] ?? genre.query, "genre");
      for (const label of genre.labels.slice(1, 3)) {
        if (
          !trimmed ||
          label.toLowerCase().includes(trimmed.toLowerCase()) ||
          trimmed.toLowerCase().includes(label.toLowerCase())
        ) {
          push(label, "genre");
        }
      }
    }
  }

  // Classic Mixkit genre tags for music autocomplete.
  if (kind === "music") {
    for (const tag of [
      "Ambient",
      "Classical",
      "Funk",
      "Jazz",
      "Rock",
      "Sad",
      "Trap",
      "Holiday",
      "Drum & Bass",
    ]) {
      if (!trimmed || tag.toLowerCase().includes(trimmed.toLowerCase())) {
        push(tag, "tag");
      }
    }
  }

  return out.slice(0, limit);
}

export function mixkitDownloadUrl(trackId: string): string | null {
  const sfx = /^mixkit-sfx-(\d+)$/.exec(trackId);
  if (sfx) return mixkitSfxPreview(sfx[1]);

  const music = /^mixkit-(\d+)$/.exec(trackId);
  if (!music) return null;
  return mixkitMp3(music[1]);
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

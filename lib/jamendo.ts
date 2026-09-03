const JAMENDO_BASE = "https://api.jamendo.com/v3.0";

export type MusicTrackDto = {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  previewUrl: string;
  imageUrl: string;
  downloadAllowed: boolean;
  licenseUrl: string | null;
};

export function jamendoClientId(): string {
  return (process.env.JAMENDO_CLIENT_ID ?? "").trim();
}

export function isJamendoConfigured(): boolean {
  return jamendoClientId().length > 0;
}

export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function parseTrack(json: Record<string, unknown>): MusicTrackDto {
  return {
    id: String(json.id ?? ""),
    title: (json.name as string) || "Untitled",
    artist: (json.artist_name as string) || "Unknown artist",
    durationSec: Number(json.duration ?? 0),
    previewUrl: (json.audio as string) || "",
    imageUrl: (json.image as string) || "",
    downloadAllowed: Boolean(json.audiodownload_allowed ?? false),
    licenseUrl: (json.license_ccurl as string) || null,
  };
}

async function jamendoTracks(
  params: Record<string, string>,
): Promise<MusicTrackDto[]> {
  const clientId = jamendoClientId();
  if (!clientId) {
    throw new Error("jamendo_not_configured");
  }

  const url = new URL(`${JAMENDO_BASE}/tracks/`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("format", "json");
  url.searchParams.set("audioformat", "mp32");
  url.searchParams.set("include", "musicinfo");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`jamendo_upstream_${response.status}`);
  }

  const body = (await response.json()) as {
    results?: Record<string, unknown>[];
  };
  const results = body.results ?? [];
  return results
    .map(parseTrack)
    .filter((track) => track.id.length > 0 && track.downloadAllowed);
}

export async function searchTracks(
  query: string,
  limit = 20,
  offset = 0,
): Promise<MusicTrackDto[]> {
  return jamendoTracks({
    limit: String(limit),
    offset: String(offset),
    namesearch: query,
  });
}

export async function featuredTracks(limit = 24): Promise<MusicTrackDto[]> {
  return jamendoTracks({
    limit: String(limit),
    order: "popularity_total_desc",
  });
}

export function jamendoDownloadUrl(trackId: string): string {
  const url = new URL(`${JAMENDO_BASE}/tracks/file`);
  url.searchParams.set("client_id", jamendoClientId());
  url.searchParams.set("id", trackId);
  url.searchParams.set("action", "download");
  url.searchParams.set("audioformat", "mp32");
  return url.toString();
}

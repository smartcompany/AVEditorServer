import {
  BACKGROUND_CATALOG_SEED_VERSION,
  buildBackgroundCatalog,
  type BackgroundCatalog,
  type BackgroundCatalogItem,
} from "@/lib/backgrounds";
import { getSupabaseAdmin, hasSupabaseConfig, storageBucket } from "@/lib/supabase";

export const BACKGROUND_CATALOG_OBJECT_KEY = "backgrounds/catalog.json";

function isCatalogShape(value: unknown): value is BackgroundCatalog {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return typeof c.version === "number" && Array.isArray(c.items);
}

function withBaseUrl(catalog: BackgroundCatalog, origin: string): BackgroundCatalog {
  const baseUrl = origin.endsWith("/") ? origin : `${origin}/`;
  return { ...catalog, baseUrl };
}

export async function getBackgroundCatalog(origin: string): Promise<BackgroundCatalog> {
  const seed = buildBackgroundCatalog(origin);
  if (!hasSupabaseConfig()) return seed;

  try {
    const url = process.env.SUPABASE_URL?.trim() ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
    const res = await fetch(
      `${url}/storage/v1/object/${storageBucket()}/${BACKGROUND_CATALOG_OBJECT_KEY}?cb=${Date.now()}`,
      {
        headers: { Authorization: `Bearer ${key}`, apikey: key },
        cache: "no-store",
      },
    );
    if (!res.ok) return seed;
    const parsed: unknown = await res.json();
    if (!isCatalogShape(parsed)) return seed;
    if (parsed.version < BACKGROUND_CATALOG_SEED_VERSION) return seed;
    return withBaseUrl(parsed, origin);
  } catch (error) {
    console.warn("[backgrounds] Storage read failed, using seed:", error);
    return seed;
  }
}

export async function putBackgroundCatalog(
  catalog: BackgroundCatalog,
): Promise<BackgroundCatalog> {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured");
  }
  const next: BackgroundCatalog = {
    ...catalog,
    version: Math.max(
      Math.floor(Number(catalog.version) || 0) + 1,
      BACKGROUND_CATALOG_SEED_VERSION + 1,
    ),
  };
  const body = `${JSON.stringify(next, null, 2)}\n`;
  const { error } = await getSupabaseAdmin()
    .storage.from(storageBucket())
    .upload(BACKGROUND_CATALOG_OBJECT_KEY, body, {
      contentType: "application/json; charset=utf-8",
      upsert: true,
      cacheControl: "0",
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return next;
}

export function assertBackgroundCatalogWritable(
  value: unknown,
): asserts value is BackgroundCatalog {
  if (!isCatalogShape(value)) {
    throw new Error("Catalog must include version and items[]");
  }
  for (const item of value.items) {
    assertItem(item);
  }
}

function assertItem(item: BackgroundCatalogItem): void {
  if (!item || typeof item !== "object") throw new Error("Invalid background item");
  if (!item.id || !item.title || !item.imageUrl) {
    throw new Error(`Background ${item.id ?? "?"} needs id, title, imageUrl`);
  }
}

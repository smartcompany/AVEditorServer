import {
  buildCatalog,
  TEXT_CATALOG_SEED_VERSION,
  type TextTemplatePackCatalog,
  type TextTemplatePackItem,
} from "@/lib/catalog";
import { getSupabaseAdmin, hasSupabaseConfig, storageBucket } from "@/lib/supabase";

export const TEXT_CATALOG_OBJECT_KEY = "text_packs/catalog.json";

function isCatalogShape(value: unknown): value is TextTemplatePackCatalog {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return typeof c.version === "number" && Array.isArray(c.categories);
}

function withBaseUrl(
  catalog: TextTemplatePackCatalog,
  origin: string,
): TextTemplatePackCatalog {
  const baseUrl = origin.endsWith("/") ? origin : `${origin}/`;
  return { ...catalog, baseUrl };
}

/**
 * Text effects + templates for Flutter and the dashboard.
 *
 * Supabase Storage (`text_packs/catalog.json`) wins once the dashboard has
 * saved it; the TypeScript seed is used when Storage is empty, unreachable,
 * or older than the seed (so code-side catalog changes still ship).
 */
export async function getTextPackCatalog(
  origin: string,
): Promise<TextTemplatePackCatalog> {
  const seed = buildCatalog(origin);
  if (!hasSupabaseConfig()) return seed;

  try {
    const url = process.env.SUPABASE_URL?.trim() ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
    const res = await fetch(
      `${url}/storage/v1/object/${storageBucket()}/${TEXT_CATALOG_OBJECT_KEY}?cb=${Date.now()}`,
      {
        headers: { Authorization: `Bearer ${key}`, apikey: key },
        cache: "no-store",
      },
    );
    if (!res.ok) return seed;
    const parsed: unknown = await res.json();
    if (!isCatalogShape(parsed)) return seed;
    if (parsed.version < TEXT_CATALOG_SEED_VERSION) return seed;
    return withBaseUrl(parsed, origin);
  } catch (error) {
    console.warn("[text-packs] Storage read failed, using seed:", error);
    return seed;
  }
}

export async function putTextPackCatalog(
  catalog: TextTemplatePackCatalog,
): Promise<TextTemplatePackCatalog> {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured");
  }
  const next: TextTemplatePackCatalog = {
    ...catalog,
    // Always above the seed so clients prefer the saved catalog.
    version: Math.max(
      Math.floor(Number(catalog.version) || 0) + 1,
      TEXT_CATALOG_SEED_VERSION + 1,
    ),
  };
  const body = `${JSON.stringify(next, null, 2)}\n`;
  const { error } = await getSupabaseAdmin()
    .storage.from(storageBucket())
    .upload(TEXT_CATALOG_OBJECT_KEY, body, {
      contentType: "application/json; charset=utf-8",
      upsert: true,
      cacheControl: "0",
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return next;
}

export function assertTextCatalogWritable(
  value: unknown,
): asserts value is TextTemplatePackCatalog {
  if (!isCatalogShape(value)) {
    throw new Error("Catalog must include version and categories[]");
  }
  const seen = new Set<string>();
  for (const category of value.categories) {
    if (!category?.id || !Array.isArray(category.items)) {
      throw new Error("Each category needs an id and items[]");
    }
    for (const item of category.items as TextTemplatePackItem[]) {
      if (!item?.id || typeof item.id !== "string") {
        throw new Error("Each item needs a string id");
      }
      if (seen.has(item.id)) throw new Error(`Duplicate item id: ${item.id}`);
      seen.add(item.id);
      if (!item.title || typeof item.title !== "string") {
        throw new Error(`Item ${item.id} needs a title`);
      }
      if (!item.style || typeof item.style !== "object") {
        throw new Error(`Item ${item.id} needs a style object`);
      }
    }
  }
}

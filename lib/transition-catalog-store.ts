import {
  buildTransitionCatalog,
  type TransitionCatalogDto,
  type TransitionItemDto,
} from "@/lib/transitions";
import { getSupabaseAdmin, hasSupabaseConfig, storageBucket } from "@/lib/supabase";

export const CATALOG_OBJECT_KEY = "transitions/catalog.json";

function isCatalogShape(value: unknown): value is TransitionCatalogDto {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.version === "number" &&
    Array.isArray(c.items) &&
    Array.isArray(c.categories)
  );
}

/** Normalize flat/category catalogs so `items` is always populated. */
export function normalizeCatalog(raw: TransitionCatalogDto): TransitionCatalogDto {
  const fromCategories =
    raw.categories?.flatMap((cat) => cat.items ?? []) ?? [];
  const items =
    raw.items && raw.items.length > 0 ? raw.items : fromCategories;
  return {
    ...raw,
    items,
    categories:
      raw.categories && raw.categories.length > 0
        ? raw.categories
        : [
            {
              id: "basic",
              title: "Basic",
              titles: {
                en: "Basic",
                ko: "기본",
                ja: "ベーシック",
                zh: "基础",
              },
              items,
            },
          ],
  };
}

/**
 * Load catalog from Supabase Storage. Falls back to the TypeScript seed when
 * Storage is empty/unavailable.
 */
export async function getTransitionCatalog(): Promise<TransitionCatalogDto> {
  if (!hasSupabaseConfig()) {
    return normalizeCatalog(buildTransitionCatalog());
  }

  try {
    const url = process.env.SUPABASE_URL?.trim() ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
    const objectUrl =
      `${url}/storage/v1/object/${storageBucket()}/${CATALOG_OBJECT_KEY}` +
      `?cb=${Date.now()}`;

    const res = await fetch(objectUrl, {
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      cache: "no-store",
    });

    if (res.status === 404) {
      console.warn("[transitions] Storage miss, using seed");
      return normalizeCatalog(buildTransitionCatalog());
    }
    if (!res.ok) {
      console.warn(
        "[transitions] Storage fetch failed, using seed:",
        res.status,
      );
      return normalizeCatalog(buildTransitionCatalog());
    }

    const parsed: unknown = await res.json();
    if (!isCatalogShape(parsed)) {
      console.warn("[transitions] Invalid Storage catalog shape, using seed");
      return normalizeCatalog(buildTransitionCatalog());
    }
    return normalizeCatalog(parsed);
  } catch (error) {
    console.warn("[transitions] Storage read failed, using seed:", error);
    return normalizeCatalog(buildTransitionCatalog());
  }
}

export async function putTransitionCatalog(
  catalog: TransitionCatalogDto,
): Promise<TransitionCatalogDto> {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured");
  }

  const normalized = normalizeCatalog(catalog);
  const next: TransitionCatalogDto = {
    ...normalized,
    version: Math.max(1, Math.floor(normalized.version || 1)),
  };

  const body = `${JSON.stringify(next, null, 2)}\n`;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(storageBucket())
    .upload(CATALOG_OBJECT_KEY, body, {
      contentType: "application/json; charset=utf-8",
      upsert: true,
      cacheControl: "0",
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return next;
}

/** Lightweight validation before accepting dashboard saves. */
export function assertCatalogWritable(
  value: unknown,
): asserts value is TransitionCatalogDto {
  if (!isCatalogShape(value)) {
    throw new Error("Catalog must include version, items[], and categories[]");
  }
  for (const item of value.items as TransitionItemDto[]) {
    if (!item?.id || typeof item.id !== "string") {
      throw new Error("Each catalog item needs a string id");
    }
  }
}

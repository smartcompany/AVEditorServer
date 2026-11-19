import {
  defaultPlansConfig,
  type LocaleMap,
  type PlanConfigItem,
  type PlanTier,
  type PlansConfig,
} from "@/lib/plans-config";
import { getSupabaseAdmin, hasSupabaseConfig, storageBucket } from "@/lib/supabase";

export const PLANS_CONFIG_OBJECT_KEY = "plans/config.json";

const PLAN_IDS: PlanTier[] = ["free", "plus", "pro", "studio"];

function isLocaleMap(value: unknown): value is LocaleMap {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.en === "string" &&
    typeof m.ko === "string" &&
    typeof m.ja === "string" &&
    typeof m.zh === "string"
  );
}

function isPlanItem(value: unknown): value is PlanConfigItem {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    PLAN_IDS.includes(p.id as PlanTier) &&
    typeof p.title === "string" &&
    isLocaleMap(p.titles) &&
    isLocaleMap(p.subtitle) &&
    Array.isArray(p.benefits) &&
    p.benefits.every(isLocaleMap) &&
    typeof p.editingUnlocked === "boolean" &&
    typeof p.aiEnabled === "boolean" &&
    typeof p.monthlyCredits === "number"
  );
}

function isPlansConfig(value: unknown): value is PlansConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  const economy = c.economy;
  if (!economy || typeof economy !== "object") return false;
  const e = economy as Record<string, unknown>;
  return (
    typeof c.version === "number" &&
    typeof e.startingCredits === "number" &&
    typeof e.adRewardCredits === "number" &&
    Array.isArray(c.plans) &&
    c.plans.every(isPlanItem)
  );
}

/** Ensure all four tiers exist; fill gaps from defaults. */
export function normalizePlansConfig(raw: PlansConfig): PlansConfig {
  const seed = defaultPlansConfig();
  const byId = new Map(raw.plans.map((p) => [p.id, p]));
  const plans = PLAN_IDS.map((id) => {
    const incoming = byId.get(id);
    const fallback = seed.plans.find((p) => p.id === id)!;
    if (!incoming) return fallback;
    return {
      ...fallback,
      ...incoming,
      id,
      titles: { ...fallback.titles, ...incoming.titles },
      subtitle: { ...fallback.subtitle, ...incoming.subtitle },
      benefits:
        incoming.benefits.length > 0 ? incoming.benefits : fallback.benefits,
      monthlyCredits: Math.max(0, Math.floor(incoming.monthlyCredits)),
    };
  });
  return {
    version: Math.max(1, Math.floor(raw.version || 1)),
    economy: {
      startingCredits: Math.max(
        0,
        Math.floor(raw.economy?.startingCredits ?? seed.economy.startingCredits),
      ),
      adRewardCredits: Math.max(
        0,
        Math.floor(raw.economy?.adRewardCredits ?? seed.economy.adRewardCredits),
      ),
    },
    plans,
  };
}

/**
 * Load plans config from Supabase Storage. Falls back to code defaults.
 */
export async function getPlansConfig(): Promise<PlansConfig> {
  if (!hasSupabaseConfig()) {
    return defaultPlansConfig();
  }

  try {
    const url = process.env.SUPABASE_URL?.trim() ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
    const objectUrl =
      `${url}/storage/v1/object/${storageBucket()}/${PLANS_CONFIG_OBJECT_KEY}` +
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
      return defaultPlansConfig();
    }
    if (!res.ok) {
      console.warn("[plans] Storage fetch failed, using seed:", res.status);
      return defaultPlansConfig();
    }

    const parsed: unknown = await res.json();
    if (!isPlansConfig(parsed)) {
      console.warn("[plans] Invalid Storage shape, using seed");
      return defaultPlansConfig();
    }
    return normalizePlansConfig(parsed);
  } catch (error) {
    console.warn("[plans] Storage read failed, using seed:", error);
    return defaultPlansConfig();
  }
}

export async function putPlansConfig(
  config: PlansConfig,
): Promise<PlansConfig> {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured");
  }

  const next = normalizePlansConfig({
    ...config,
    version: Math.max(
      Math.floor(config.version || 1),
      defaultPlansConfig().version + 1,
    ),
  });

  const body = `${JSON.stringify(next, null, 2)}\n`;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(storageBucket())
    .upload(PLANS_CONFIG_OBJECT_KEY, body, {
      contentType: "application/json; charset=utf-8",
      upsert: true,
      cacheControl: "0",
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  return next;
}

export function assertPlansConfigWritable(
  value: unknown,
): asserts value is PlansConfig {
  if (!isPlansConfig(value)) {
    throw new Error(
      "Plans config must include version, economy, and plans[] with free/plus/pro/studio",
    );
  }
}

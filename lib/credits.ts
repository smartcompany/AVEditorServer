/** EasyClip credit economy helpers. Plan allotments live in plans-config. */

import {
  defaultPlansConfig,
  type PlansConfig,
  type PlanTier as PlansConfigTier,
} from "@/lib/plans-config";

export const STARTING_CREDITS = 100;
export const AD_REWARD_CREDITS = 25;

export const DEFAULT_TRANSITION_COST = 40;
export const HEAVY_TRANSITION_COST = 50;
export const DEFAULT_TEXT_COST = 25;
export const STYLE_TEXT_COST = 30;

/** Seed monthly allotments (overridden by dashboard-saved plans/config.json). */
export const PLUS_MONTHLY_CREDITS = 500;
export const PRO_MONTHLY_CREDITS = 1500;
export const STUDIO_MONTHLY_CREDITS = 4000;

const HEAVY_TRANSITIONS = new Set([
  "cube",
  "mosaic",
  "puzzleleft",
  "puzzleright",
  "crosszoom",
  "ripple",
]);

const STYLE_TEXTS = new Set([
  "effect_neon_pink",
  "effect_neon_blue",
  "effect_gold",
  "effect_fire",
  "effect_ice",
  "pack_neon_pink",
  "pack_gold_title",
  "pack_frost",
  "pack_cyber",
]);

export type CreditItemKind = "transition" | "text";

export type PlanTier = PlansConfigTier;

export type PlanDef = {
  id: PlanTier;
  title: string;
  editingUnlocked: boolean;
  aiEnabled: boolean;
  /** Credits granted once per calendar month while subscribed. */
  monthlyCredits: number;
};

/** Sync fallback used when Storage config is unavailable. */
export const PLANS: PlanDef[] = defaultPlansConfig().plans.map((p) => ({
  id: p.id,
  title: p.title,
  editingUnlocked: p.editingUnlocked,
  aiEnabled: p.aiEnabled,
  monthlyCredits: p.monthlyCredits,
}));

export function monthlyCreditsFor(
  tier: string | null | undefined,
  config?: PlansConfig,
): number {
  const plans = config?.plans ?? defaultPlansConfig().plans;
  const plan = plans.find((p) => p.id === tier);
  return plan?.monthlyCredits ?? 0;
}

export function costFor(kind: CreditItemKind, id: string): number {
  if (kind === "transition") {
    return HEAVY_TRANSITIONS.has(id)
      ? HEAVY_TRANSITION_COST
      : DEFAULT_TRANSITION_COST;
  }
  return STYLE_TEXTS.has(id) ? STYLE_TEXT_COST : DEFAULT_TEXT_COST;
}

export function costMap(config?: PlansConfig): {
  transitions: Record<string, number>;
  texts: Record<string, number>;
  defaults: { transition: number; text: number };
  adReward: number;
  startingCredits: number;
  monthlyCredits: Record<Exclude<PlanTier, "free">, number>;
} {
  const cfg = config ?? defaultPlansConfig();
  const transitions: Record<string, number> = {};
  for (const id of [
    "spinin",
    "spinout",
    "doorway",
    "swap",
    "cube",
    "mosaic",
    "puzzleleft",
    "puzzleright",
    "crosszoom",
    "ripple",
  ]) {
    transitions[id] = costFor("transition", id);
  }
  const texts: Record<string, number> = {};
  for (const id of [
    "effect_neon_pink",
    "effect_neon_blue",
    "effect_gold",
    "effect_fire",
    "effect_ice",
    "effect_candy",
    "effect_glow",
    "effect_color_pop",
    "pack_breaking",
    "pack_neon_pink",
    "pack_cyber",
    "pack_gold_title",
    "pack_hot",
    "pack_frost",
    "pack_candy",
    "pack_sunset",
  ]) {
    texts[id] = costFor("text", id);
  }
  return {
    transitions,
    texts,
    defaults: { transition: DEFAULT_TRANSITION_COST, text: DEFAULT_TEXT_COST },
    adReward: cfg.economy.adRewardCredits,
    startingCredits: cfg.economy.startingCredits,
    monthlyCredits: {
      plus: monthlyCreditsFor("plus", cfg),
      pro: monthlyCreditsFor("pro", cfg),
      studio: monthlyCreditsFor("studio", cfg),
    },
  };
}

export function totalCost(
  items: Array<{ kind: CreditItemKind; id: string }>,
): number {
  const seen = new Set<string>();
  let total = 0;
  for (const item of items) {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    total += costFor(item.kind, item.id);
  }
  return total;
}

export function planUnlocksEditing(tier: string | null | undefined): boolean {
  return tier === "plus" || tier === "pro" || tier === "studio";
}

export function planUnlocksAi(tier: string | null | undefined): boolean {
  return tier === "pro" || tier === "studio";
}

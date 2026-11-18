/** EasyClip credit economy + subscription plan flags (server source of truth). */

export const STARTING_CREDITS = 100;
export const AD_REWARD_CREDITS = 25;

export const DEFAULT_TRANSITION_COST = 40;
export const HEAVY_TRANSITION_COST = 50;
export const DEFAULT_TEXT_COST = 25;
export const STYLE_TEXT_COST = 30;

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

export type PlanTier = "free" | "plus" | "pro" | "studio";

export type PlanDef = {
  id: PlanTier;
  title: string;
  editingUnlocked: boolean;
  aiEnabled: boolean;
};

export const PLANS: PlanDef[] = [
  {
    id: "free",
    title: "Free",
    editingUnlocked: false,
    aiEnabled: false,
  },
  {
    id: "plus",
    title: "Plus",
    editingUnlocked: true,
    aiEnabled: false,
  },
  {
    id: "pro",
    title: "Pro",
    editingUnlocked: true,
    aiEnabled: true,
  },
  {
    id: "studio",
    title: "Studio",
    editingUnlocked: true,
    aiEnabled: true,
  },
];

export function costFor(kind: CreditItemKind, id: string): number {
  if (kind === "transition") {
    return HEAVY_TRANSITIONS.has(id)
      ? HEAVY_TRANSITION_COST
      : DEFAULT_TRANSITION_COST;
  }
  return STYLE_TEXTS.has(id) ? STYLE_TEXT_COST : DEFAULT_TEXT_COST;
}

export function costMap(): {
  transitions: Record<string, number>;
  texts: Record<string, number>;
  defaults: { transition: number; text: number };
  adReward: number;
  startingCredits: number;
} {
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
    adReward: AD_REWARD_CREDITS,
    startingCredits: STARTING_CREDITS,
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

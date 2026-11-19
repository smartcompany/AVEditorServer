import { getSupabaseAdmin } from "@/lib/supabase";
import {
  ensureMonthlyGrant,
  findAccountByUid,
  type CreditAccount,
} from "@/lib/credit-accounts";
import type { PlanTier } from "@/lib/credits";

export type StorePlatform = "ios" | "android";

export type SubscriptionStatus =
  | "active"
  | "expired"
  | "refunded"
  | "grace"
  | "billing_retry"
  | "revoked";

export type SubscriptionRow = {
  id: string;
  firebase_uid: string;
  platform: StorePlatform;
  product_id: string;
  tier: Exclude<PlanTier, "free">;
  store_identity: string;
  original_transaction_id: string | null;
  purchase_token: string | null;
  status: SubscriptionStatus;
  expires_at: string | null;
  environment: string | null;
  raw: unknown;
  last_verified_at: string;
  created_at: string;
  updated_at: string;
};

const SUB_COLS =
  "id, firebase_uid, platform, product_id, tier, store_identity, original_transaction_id, purchase_token, status, expires_at, environment, raw, last_verified_at, created_at, updated_at";

const PRODUCT_TIER: Record<string, Exclude<PlanTier, "free">> = {
  easyclip_plus_monthly: "plus",
  easyclip_plus_annual: "plus",
  easyclip_pro_monthly: "pro",
  easyclip_pro_annual: "pro",
  easyclip_studio_monthly: "studio",
  easyclip_studio_annual: "studio",
};

const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  plus: 1,
  pro: 2,
  studio: 3,
};

export const ALL_STORE_PRODUCT_IDS = Object.keys(PRODUCT_TIER);

export function tierFromProductId(
  productId: string | null | undefined,
): Exclude<PlanTier, "free"> | null {
  if (!productId) return null;
  return PRODUCT_TIER[productId] ?? null;
}

export function isSubscriptionActive(
  status: SubscriptionStatus,
  expiresAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (status === "refunded" || status === "revoked" || status === "expired") {
    return false;
  }
  if (status === "active" || status === "grace" || status === "billing_retry") {
    if (!expiresAt) return status === "active";
    return new Date(expiresAt).getTime() > now.getTime();
  }
  return false;
}

export type UpsertSubscriptionInput = {
  firebaseUid: string;
  platform: StorePlatform;
  productId: string;
  storeIdentity: string;
  originalTransactionId?: string | null;
  purchaseToken?: string | null;
  status: SubscriptionStatus;
  expiresAt?: Date | string | null;
  environment?: string | null;
  raw?: unknown;
};

export async function upsertSubscription(
  input: UpsertSubscriptionInput,
): Promise<SubscriptionRow> {
  const tier = tierFromProductId(input.productId);
  if (!tier) {
    throw new Error(`unknown_product:${input.productId}`);
  }

  const expiresAt =
    input.expiresAt == null
      ? null
      : input.expiresAt instanceof Date
        ? input.expiresAt.toISOString()
        : input.expiresAt;

  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("aveditor_subscriptions")
    .upsert(
      {
        firebase_uid: input.firebaseUid,
        platform: input.platform,
        product_id: input.productId,
        tier,
        store_identity: input.storeIdentity,
        original_transaction_id: input.originalTransactionId ?? null,
        purchase_token: input.purchaseToken ?? null,
        status: input.status,
        expires_at: expiresAt,
        environment: input.environment ?? null,
        raw: input.raw ?? null,
        last_verified_at: now,
        updated_at: now,
      },
      { onConflict: "platform,store_identity" },
    )
    .select(SUB_COLS)
    .single();
  if (error) throw error;
  return data as SubscriptionRow;
}

export async function listSubscriptionsForUid(
  firebaseUid: string,
): Promise<SubscriptionRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("aveditor_subscriptions")
    .select(SUB_COLS)
    .eq("firebase_uid", firebaseUid)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as SubscriptionRow[]) ?? [];
}

export async function findSubscriptionByStoreIdentity(
  platform: StorePlatform,
  storeIdentity: string,
): Promise<SubscriptionRow | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("aveditor_subscriptions")
    .select(SUB_COLS)
    .eq("platform", platform)
    .eq("store_identity", storeIdentity)
    .maybeSingle();
  if (error) throw error;
  return (data as SubscriptionRow | null) ?? null;
}

export async function findSubscriptionByOriginalTransactionId(
  originalTransactionId: string,
): Promise<SubscriptionRow | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("aveditor_subscriptions")
    .select(SUB_COLS)
    .eq("original_transaction_id", originalTransactionId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SubscriptionRow | null) ?? null;
}

export async function searchSubscriptions(opts: {
  firebaseUid?: string;
  originalTransactionId?: string;
  storeIdentity?: string;
  limit?: number;
}): Promise<SubscriptionRow[]> {
  const sb = getSupabaseAdmin();
  let q = sb.from("aveditor_subscriptions").select(SUB_COLS);
  if (opts.firebaseUid) q = q.eq("firebase_uid", opts.firebaseUid);
  if (opts.originalTransactionId) {
    q = q.eq("original_transaction_id", opts.originalTransactionId);
  }
  if (opts.storeIdentity) q = q.eq("store_identity", opts.storeIdentity);
  const { data, error } = await q
    .order("updated_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (error) throw error;
  return (data as SubscriptionRow[]) ?? [];
}

/** Highest active tier for a user, or free. */
export function bestActiveTier(
  rows: SubscriptionRow[],
  now = new Date(),
): PlanTier {
  let best: PlanTier = "free";
  for (const row of rows) {
    if (!isSubscriptionActive(row.status, row.expires_at, now)) continue;
    if (TIER_RANK[row.tier] > TIER_RANK[best]) best = row.tier;
  }
  return best;
}

/**
 * Recompute credit account plan_tier from active subscriptions.
 * Creates no account if the user has none yet and tier is free.
 */
export async function syncPlanTierForUid(
  firebaseUid: string,
): Promise<{ planTier: PlanTier; account: CreditAccount | null }> {
  const rows = await listSubscriptionsForUid(firebaseUid);
  const planTier = bestActiveTier(rows);
  let account = await findAccountByUid(firebaseUid);

  if (!account) {
    if (planTier === "free") {
      return { planTier, account: null };
    }
    // Ensure an account exists so monthly grants can apply.
    const sb = getSupabaseAdmin();
    const deviceKey = `uid:${firebaseUid}`;
    const { data, error } = await sb
      .from("aveditor_credit_accounts")
      .upsert(
        {
          device_key: deviceKey,
          firebase_uid: firebaseUid,
          balance: 0,
          plan_tier: planTier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "firebase_uid" },
      )
      .select(
        "id, device_key, firebase_uid, balance, plan_tier, last_credit_grant_ym",
      )
      .single();
    if (error) {
      // Race / unique on device_key — fall back to lookup.
      account = await findAccountByUid(firebaseUid);
      if (!account) throw error;
    } else {
      account = data as CreditAccount;
    }
  }

  if (account.plan_tier !== planTier) {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("aveditor_credit_accounts")
      .update({
        plan_tier: planTier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id)
      .select(
        "id, device_key, firebase_uid, balance, plan_tier, last_credit_grant_ym",
      )
      .single();
    if (error) throw error;
    account = data as CreditAccount;
  }

  account = await ensureMonthlyGrant(account);
  return { planTier: account.plan_tier, account };
}

/** Support/dashboard override — does not create a store row. */
export async function overridePlanTierForUid(
  firebaseUid: string,
  planTier: PlanTier,
): Promise<CreditAccount> {
  let account = await findAccountByUid(firebaseUid);
  const sb = getSupabaseAdmin();
  if (!account) {
    const { data, error } = await sb
      .from("aveditor_credit_accounts")
      .insert({
        device_key: `uid:${firebaseUid}`,
        firebase_uid: firebaseUid,
        balance: 0,
        plan_tier: planTier,
      })
      .select(
        "id, device_key, firebase_uid, balance, plan_tier, last_credit_grant_ym",
      )
      .single();
    if (error) throw error;
    account = data as CreditAccount;
  } else {
    const { data, error } = await sb
      .from("aveditor_credit_accounts")
      .update({
        plan_tier: planTier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id)
      .select(
        "id, device_key, firebase_uid, balance, plan_tier, last_credit_grant_ym",
      )
      .single();
    if (error) throw error;
    account = data as CreditAccount;
  }
  return ensureMonthlyGrant(account);
}

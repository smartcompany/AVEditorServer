import { getSupabaseAdmin } from "@/lib/supabase";
import {
  bootstrapAccount,
  ensureMonthlyGrant,
  findAccountByDevice,
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
  firebase_uid: string | null;
  device_key: string | null;
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
  "id, firebase_uid, device_key, platform, product_id, tier, store_identity, original_transaction_id, purchase_token, status, expires_at, environment, raw, last_verified_at, created_at, updated_at";

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
  /** Optional — set when the app user is signed in. */
  firebaseUid?: string | null;
  /** Install/device key — used when there is no app login. */
  deviceKey?: string | null;
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
  if (!input.firebaseUid && !input.deviceKey) {
    throw new Error("owner_required");
  }

  const expiresAt =
    input.expiresAt == null
      ? null
      : input.expiresAt instanceof Date
        ? input.expiresAt.toISOString()
        : input.expiresAt;

  // Preserve any existing owner fields when webhook updates omit one side.
  const existing = await findSubscriptionByStoreIdentity(
    input.platform,
    input.storeIdentity,
  );
  const firebaseUid = input.firebaseUid ?? existing?.firebase_uid ?? null;
  const deviceKey = input.deviceKey ?? existing?.device_key ?? null;

  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("aveditor_subscriptions")
    .upsert(
      {
        firebase_uid: firebaseUid,
        device_key: deviceKey,
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

export async function listSubscriptionsForDevice(
  deviceKey: string,
): Promise<SubscriptionRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("aveditor_subscriptions")
    .select(SUB_COLS)
    .eq("device_key", deviceKey)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as SubscriptionRow[]) ?? [];
}

export async function listSubscriptionsForOwner(opts: {
  firebaseUid?: string | null;
  deviceKey?: string | null;
}): Promise<SubscriptionRow[]> {
  const uid = opts.firebaseUid?.trim() || null;
  const deviceKey = opts.deviceKey?.trim() || null;
  if (!uid && !deviceKey) return [];

  if (uid && deviceKey) {
    const [byUid, byDevice] = await Promise.all([
      listSubscriptionsForUid(uid),
      listSubscriptionsForDevice(deviceKey),
    ]);
    const map = new Map<string, SubscriptionRow>();
    for (const row of [...byUid, ...byDevice]) map.set(row.id, row);
    return [...map.values()].sort((a, b) =>
      (b.updated_at || "").localeCompare(a.updated_at || ""),
    );
  }
  if (uid) return listSubscriptionsForUid(uid);
  return listSubscriptionsForDevice(deviceKey!);
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

async function applyPlanTierToAccount(
  account: CreditAccount,
  planTier: PlanTier,
): Promise<CreditAccount> {
  if (account.plan_tier === planTier) {
    return ensureMonthlyGrant(account);
  }
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
  return ensureMonthlyGrant(data as CreditAccount);
}

/**
 * Recompute credit account plan_tier from active subscriptions.
 * Prefer device account when deviceKey is present; otherwise uid account.
 */
export async function syncPlanTierForOwner(opts: {
  firebaseUid?: string | null;
  deviceKey?: string | null;
}): Promise<{ planTier: PlanTier; account: CreditAccount | null }> {
  const firebaseUid = opts.firebaseUid?.trim() || null;
  const deviceKey = opts.deviceKey?.trim() || null;
  const rows = await listSubscriptionsForOwner({ firebaseUid, deviceKey });
  const planTier = bestActiveTier(rows);

  let account: CreditAccount | null = null;
  if (deviceKey) {
    account = await findAccountByDevice(deviceKey);
    if (!account && planTier !== "free") {
      account = await bootstrapAccount(deviceKey);
    }
  }
  if (!account && firebaseUid) {
    account = await findAccountByUid(firebaseUid);
    if (!account && planTier !== "free") {
      const sb = getSupabaseAdmin();
      const { data, error } = await sb
        .from("aveditor_credit_accounts")
        .upsert(
          {
            device_key: `uid:${firebaseUid}`,
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
        account = await findAccountByUid(firebaseUid);
        if (!account) throw error;
      } else {
        account = data as CreditAccount;
      }
    }
  }

  if (!account) {
    return { planTier, account: null };
  }

  account = await applyPlanTierToAccount(account, planTier);
  return { planTier: account.plan_tier, account };
}

export async function syncPlanTierForUid(
  firebaseUid: string,
): Promise<{ planTier: PlanTier; account: CreditAccount | null }> {
  return syncPlanTierForOwner({ firebaseUid });
}

/** Attach device-owned store rows to a Firebase uid after app login. */
export async function claimDeviceSubscriptions(
  deviceKey: string,
  firebaseUid: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  await sb
    .from("aveditor_subscriptions")
    .update({
      firebase_uid: firebaseUid,
      updated_at: new Date().toISOString(),
    })
    .eq("device_key", deviceKey);
  await syncPlanTierForOwner({ firebaseUid, deviceKey });
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

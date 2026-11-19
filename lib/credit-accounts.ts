import { getSupabaseAdmin } from "./supabase";
import {
  AD_REWARD_CREDITS,
  STARTING_CREDITS,
  costFor,
  monthlyCreditsFor,
  totalCost,
  type CreditItemKind,
  type PlanTier,
} from "./credits";
import { getPlansConfig } from "./plans-config-store";

export type CreditAccount = {
  id: string;
  device_key: string;
  firebase_uid: string | null;
  balance: number;
  plan_tier: PlanTier;
  last_credit_grant_ym: string | null;
};

const ACCOUNT_COLS =
  "id, device_key, firebase_uid, balance, plan_tier, last_credit_grant_ym";

function currentGrantYm(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function ledger(
  accountId: string,
  delta: number,
  reason: string,
  ref?: string,
) {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("aveditor_credit_ledger").insert({
    account_id: accountId,
    delta,
    reason,
    ref: ref ?? null,
  });
  if (error) throw error;
}

export async function findAccountByDevice(
  deviceKey: string,
): Promise<CreditAccount | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("aveditor_credit_accounts")
    .select(ACCOUNT_COLS)
    .eq("device_key", deviceKey)
    .maybeSingle();
  if (error) throw error;
  return (data as CreditAccount | null) ?? null;
}

export async function findAccountByUid(
  firebaseUid: string,
): Promise<CreditAccount | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("aveditor_credit_accounts")
    .select(ACCOUNT_COLS)
    .eq("firebase_uid", firebaseUid)
    .maybeSingle();
  if (error) throw error;
  return (data as CreditAccount | null) ?? null;
}

/** Create account with starting credits, or return existing (+ monthly grant). */
export async function bootstrapAccount(
  deviceKey: string,
): Promise<CreditAccount> {
  const existing = await findAccountByDevice(deviceKey);
  if (existing) return ensureMonthlyGrant(existing);

  const plansConfig = await getPlansConfig();
  const starting =
    plansConfig.economy.startingCredits > 0
      ? plansConfig.economy.startingCredits
      : STARTING_CREDITS;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("aveditor_credit_accounts")
    .insert({
      device_key: deviceKey,
      balance: starting,
      plan_tier: "free",
    })
    .select(ACCOUNT_COLS)
    .single();
  if (error) {
    // Race: another request created it.
    const again = await findAccountByDevice(deviceKey);
    if (again) return ensureMonthlyGrant(again);
    throw error;
  }
  const account = data as CreditAccount;
  await ledger(account.id, starting, "bootstrap");
  return ensureMonthlyGrant(account);
}

/**
 * Once per calendar month, add the plan's monthly credit allotment.
 * Free tier is a no-op. Idempotent via last_credit_grant_ym.
 */
export async function ensureMonthlyGrant(
  account: CreditAccount,
): Promise<CreditAccount> {
  const plansConfig = await getPlansConfig();
  const amount = monthlyCreditsFor(account.plan_tier, plansConfig);
  if (amount <= 0) return account;

  const ym = currentGrantYm();
  if (account.last_credit_grant_ym === ym) return account;

  const sb = getSupabaseAdmin();
  const next = account.balance + amount;
  const { data, error } = await sb
    .from("aveditor_credit_accounts")
    .update({
      balance: next,
      last_credit_grant_ym: ym,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id)
    .select(ACCOUNT_COLS)
    .single();
  if (error) throw error;
  await ledger(account.id, amount, "monthly_grant", ym);
  return data as CreditAccount;
}

export async function grantAdReward(deviceKey: string): Promise<CreditAccount> {
  const account = await bootstrapAccount(deviceKey);
  const sb = getSupabaseAdmin();

  // Light rate limit: max 1 reward per 8 seconds.
  const { data: recent } = await sb
    .from("aveditor_credit_ledger")
    .select("created_at")
    .eq("account_id", account.id)
    .eq("reason", "ad_reward")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.created_at) {
    const age = Date.now() - new Date(recent.created_at as string).getTime();
    if (age < 8000) {
      const err = new Error("ad_reward_too_soon");
      (err as Error & { status: number }).status = 429;
      throw err;
    }
  }

  const plansConfig = await getPlansConfig();
  const reward =
    plansConfig.economy.adRewardCredits > 0
      ? plansConfig.economy.adRewardCredits
      : AD_REWARD_CREDITS;
  const next = account.balance + reward;
  const { data, error } = await sb
    .from("aveditor_credit_accounts")
    .update({ balance: next, updated_at: new Date().toISOString() })
    .eq("id", account.id)
    .select(ACCOUNT_COLS)
    .single();
  if (error) throw error;
  await ledger(account.id, reward, "ad_reward");
  return data as CreditAccount;
}

export async function spendCredits(
  deviceKey: string,
  items: Array<{ kind: CreditItemKind; id: string }>,
): Promise<{ account: CreditAccount; cost: number; skipped: boolean }> {
  // Paid plans still spend credits — they receive a monthly allotment instead
  // of unlimited free exports.
  const account = await bootstrapAccount(deviceKey);

  const cost = totalCost(items);
  if (cost <= 0) {
    return { account, cost: 0, skipped: true };
  }
  if (account.balance < cost) {
    const err = new Error("insufficient_credits");
    (err as Error & { status: number; need: number; balance: number }).status =
      402;
    (err as Error & { need: number }).need = cost;
    (err as Error & { balance: number }).balance = account.balance;
    throw err;
  }

  const sb = getSupabaseAdmin();
  const next = account.balance - cost;
  const { data, error } = await sb
    .from("aveditor_credit_accounts")
    .update({ balance: next, updated_at: new Date().toISOString() })
    .eq("id", account.id)
    .eq("balance", account.balance) // optimistic
    .select(ACCOUNT_COLS)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const err = new Error("concurrent_update");
    (err as Error & { status: number }).status = 409;
    throw err;
  }
  const ref = items.map((i) => `${i.kind}:${i.id}`).join(",");
  await ledger(account.id, -cost, "spend_export", ref.slice(0, 500));
  return { account: data as CreditAccount, cost, skipped: false };
}

/** Merge device account into firebase uid (sum balances, prefer richer tier). */
export async function linkFirebaseUid(
  deviceKey: string,
  firebaseUid: string,
): Promise<CreditAccount> {
  const device = await bootstrapAccount(deviceKey);
  const byUid = await findAccountByUid(firebaseUid);
  const sb = getSupabaseAdmin();
  const tierRank: Record<string, number> = {
    free: 0,
    plus: 1,
    pro: 2,
    studio: 3,
  };

  // Claim any store subscriptions bought on this device before login.
  const { claimDeviceSubscriptions } = await import("@/lib/subscriptions");
  await claimDeviceSubscriptions(deviceKey, firebaseUid);

  if (!byUid || byUid.id === device.id) {
    const { data, error } = await sb
      .from("aveditor_credit_accounts")
      .update({
        firebase_uid: firebaseUid,
        updated_at: new Date().toISOString(),
      })
      .eq("id", device.id)
      .select(ACCOUNT_COLS)
      .single();
    if (error) throw error;
    await ledger(device.id, 0, "link_uid", firebaseUid);
    return ensureMonthlyGrant(data as CreditAccount);
  }

  // Merge: keep uid row, add device balance, delete device row.
  const mergedBalance = byUid.balance + device.balance;
  const mergedTier =
    (tierRank[byUid.plan_tier] ?? 0) >= (tierRank[device.plan_tier] ?? 0)
      ? byUid.plan_tier
      : device.plan_tier;

  const { data, error } = await sb
    .from("aveditor_credit_accounts")
    .update({
      balance: mergedBalance,
      plan_tier: mergedTier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", byUid.id)
    .select(ACCOUNT_COLS)
    .single();
  if (error) throw error;

  if (device.balance > 0) {
    await ledger(byUid.id, device.balance, "migrate_from_device", deviceKey);
  }
  await sb.from("aveditor_credit_accounts").delete().eq("id", device.id);
  return ensureMonthlyGrant(data as CreditAccount);
}

export { costFor, totalCost };

import { NextRequest, NextResponse } from "next/server";

import { authorizeDashboard } from "@/lib/dashboard-auth";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { PlanTier } from "@/lib/credits";
import {
  overridePlanTierForUid,
  searchSubscriptions,
  syncPlanTierForUid,
} from "@/lib/subscriptions";
import { findAccountByUid } from "@/lib/credit-accounts";
import { getSupabaseAdmin } from "@/lib/supabase";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** GET /api/subscriptions/admin?uid=&tx=&token= */
export async function GET(request: NextRequest) {
  if (!(await authorizeDashboard(request))) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!hasSupabaseConfig()) return json({ error: "unavailable" }, 503);

  const url = new URL(request.url);
  const uid = url.searchParams.get("uid")?.trim() || undefined;
  const tx = url.searchParams.get("tx")?.trim() || undefined;
  const token = url.searchParams.get("token")?.trim() || undefined;
  const email = url.searchParams.get("email")?.trim() || undefined;

  let firebaseUid = uid;
  if (!firebaseUid && email) {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("aveditor_app_users")
      .select("firebase_uid")
      .eq("email", email)
      .maybeSingle();
    firebaseUid = (data?.firebase_uid as string | undefined) ?? undefined;
  }

  const rows = await searchSubscriptions({
    firebaseUid,
    originalTransactionId: tx,
    storeIdentity: token,
    limit: 50,
  });

  let account = null;
  if (firebaseUid) {
    account = await findAccountByUid(firebaseUid);
  }

  return json({
    account: account
      ? {
          firebaseUid: account.firebase_uid,
          planTier: account.plan_tier,
          balance: account.balance,
        }
      : null,
    subscriptions: rows,
  });
}

/** POST /api/subscriptions/admin — support override { firebaseUid, planTier } */
export async function POST(request: NextRequest) {
  if (!(await authorizeDashboard(request))) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!hasSupabaseConfig()) return json({ error: "unavailable" }, 503);

  try {
    const body = (await request.json()) as {
      firebaseUid?: string;
      planTier?: string;
      resync?: boolean;
    };
    const firebaseUid = body.firebaseUid?.trim();
    if (!firebaseUid) return json({ error: "firebaseUid_required" }, 400);

    if (body.resync) {
      const synced = await syncPlanTierForUid(firebaseUid);
      return json({
        planTier: synced.planTier,
        balance: synced.account?.balance ?? null,
      });
    }

    const planTier = body.planTier as PlanTier | undefined;
    if (
      planTier !== "free" &&
      planTier !== "plus" &&
      planTier !== "pro" &&
      planTier !== "studio"
    ) {
      return json({ error: "planTier_invalid" }, 400);
    }

    const account = await overridePlanTierForUid(firebaseUid, planTier);
    return json({
      planTier: account.plan_tier,
      balance: account.balance,
    });
  } catch (e) {
    console.error("[subscriptions admin]", e);
    return json({ error: "admin_failed" }, 500);
  }
}

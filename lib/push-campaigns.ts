import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { getSupabaseAdmin } from "@/lib/supabase";

export type PushLocale = "en" | "ko" | "ja" | "zh";
export type LocaleMap = Record<PushLocale, string>;

export const PUSH_LOCALES: PushLocale[] = ["en", "ko", "ja", "zh"];

export type PushCampaignRow = {
  id: string;
  target: string;
  titles: LocaleMap;
  bodies: LocaleMap;
  status: string;
  send_at: string | null;
  sent_at: string | null;
  success_count: number;
  failure_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

function asLocaleMap(raw: unknown): LocaleMap {
  const src =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: LocaleMap = { en: "", ko: "", ja: "", zh: "" };
  for (const loc of PUSH_LOCALES) {
    const v = src[loc];
    out[loc] = typeof v === "string" ? v : "";
  }
  return out;
}

export function normalizeCampaign(row: Record<string, unknown>): PushCampaignRow {
  return {
    id: String(row.id),
    target: String(row.target ?? "catalog"),
    titles: asLocaleMap(row.titles),
    bodies: asLocaleMap(row.bodies),
    status: String(row.status ?? "pending"),
    send_at: (row.send_at as string | null) ?? null,
    sent_at: (row.sent_at as string | null) ?? null,
    success_count: Number(row.success_count ?? 0),
    failure_count: Number(row.failure_count ?? 0),
    error_message: (row.error_message as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

const BATCH = 500;

/** Send a campaign to catalog opt-in tokens, localized per device locale. */
export async function dispatchCampaign(campaignId: string): Promise<{
  success: number;
  failure: number;
}> {
  const db = getSupabaseAdmin();
  const { data: raw, error } = await db
    .from("aveditor_push_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!raw) throw new Error("campaign_not_found");

  const campaign = normalizeCampaign(raw as Record<string, unknown>);
  if (campaign.status === "sent") {
    return {
      success: campaign.success_count,
      failure: campaign.failure_count,
    };
  }

  await db
    .from("aveditor_push_campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  const { data: tokens, error: tokenErr } = await db
    .from("aveditor_push_tokens")
    .select("token, locale")
    .eq("master_enabled", true)
    .eq("catalog_enabled", true);
  if (tokenErr) throw tokenErr;

  const byLocale = new Map<PushLocale, string[]>();
  for (const loc of PUSH_LOCALES) byLocale.set(loc, []);
  for (const row of tokens ?? []) {
    const token = typeof row.token === "string" ? row.token.trim() : "";
    if (!token) continue;
    const loc = PUSH_LOCALES.includes(row.locale as PushLocale)
      ? (row.locale as PushLocale)
      : "en";
    byLocale.get(loc)!.push(token);
  }

  const { messaging } = getFirebaseAdmin();
  let success = 0;
  let failure = 0;
  const invalidTokens: string[] = [];

  for (const loc of PUSH_LOCALES) {
    const list = byLocale.get(loc) ?? [];
    if (list.length === 0) continue;
    const title =
      campaign.titles[loc].trim() ||
      campaign.titles.en.trim() ||
      campaign.titles.ko.trim();
    const body =
      campaign.bodies[loc].trim() ||
      campaign.bodies.en.trim() ||
      campaign.bodies.ko.trim();
    if (!title && !body) continue;

    for (let i = 0; i < list.length; i += BATCH) {
      const chunk = list.slice(i, i + BATCH);
      const res = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: title || "EasyClip",
          body: body || undefined,
        },
        data: {
          type: "catalog",
          campaignId,
        },
        android: {
          priority: "high",
          notification: {
            channelId: "easyclip_retention",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      });
      success += res.successCount;
      failure += res.failureCount;
      res.responses.forEach((r, idx) => {
        if (r.success) return;
        const code = r.error?.code ?? "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token")
        ) {
          invalidTokens.push(chunk[idx]!);
        }
      });
    }
  }

  if (invalidTokens.length > 0) {
    await db.from("aveditor_push_tokens").delete().in("token", invalidTokens);
  }

  await db
    .from("aveditor_push_campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      success_count: success,
      failure_count: failure,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return { success, failure };
}

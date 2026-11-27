import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { getSupabaseAdmin } from "@/lib/supabase";

export type PushLocale = "en" | "ko" | "ja" | "zh";
export type LocaleMap = Record<PushLocale, string>;

export const PUSH_LOCALES: PushLocale[] = ["en", "ko", "ja", "zh"];

export type PushDeliveryLogEntry = {
  deviceKey: string;
  platform: string;
  locale: string;
  /** Last 8 chars of FCM token for identification without full secret. */
  tokenTail: string;
  ok: boolean;
  error: string | null;
};

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
  delivery_log: PushDeliveryLogEntry[];
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

function tokenTail(token: string): string {
  if (token.length <= 8) return token;
  return token.slice(-8);
}

function asDeliveryLog(raw: unknown): PushDeliveryLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PushDeliveryLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    out.push({
      deviceKey: typeof row.deviceKey === "string" ? row.deviceKey : "",
      platform: typeof row.platform === "string" ? row.platform : "unknown",
      locale: typeof row.locale === "string" ? row.locale : "en",
      tokenTail: typeof row.tokenTail === "string" ? row.tokenTail : "",
      ok: Boolean(row.ok),
      error: typeof row.error === "string" ? row.error : null,
    });
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
    delivery_log: asDeliveryLog(row.delivery_log),
    error_message: (row.error_message as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

const BATCH = 500;

type TokenRow = {
  token: string;
  deviceKey: string;
  platform: string;
  locale: PushLocale;
};

/** Send a campaign to catalog opt-in tokens, localized per device locale. */
export async function dispatchCampaign(campaignId: string): Promise<{
  success: number;
  failure: number;
  deliveryLog: PushDeliveryLogEntry[];
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
      deliveryLog: campaign.delivery_log,
    };
  }

  await db
    .from("aveditor_push_campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  const { data: tokens, error: tokenErr } = await db
    .from("aveditor_push_tokens")
    .select("token, device_key, platform, locale")
    .eq("master_enabled", true)
    .eq("catalog_enabled", true);
  if (tokenErr) throw tokenErr;

  const byLocale = new Map<PushLocale, TokenRow[]>();
  for (const loc of PUSH_LOCALES) byLocale.set(loc, []);
  for (const row of tokens ?? []) {
    const token = typeof row.token === "string" ? row.token.trim() : "";
    if (!token) continue;
    const loc = PUSH_LOCALES.includes(row.locale as PushLocale)
      ? (row.locale as PushLocale)
      : "en";
    byLocale.get(loc)!.push({
      token,
      deviceKey:
        typeof row.device_key === "string" && row.device_key.trim()
          ? row.device_key.trim()
          : "(unknown)",
      platform:
        typeof row.platform === "string" && row.platform.trim()
          ? row.platform.trim()
          : "unknown",
      locale: loc,
    });
  }

  const { messaging } = getFirebaseAdmin();
  let success = 0;
  let failure = 0;
  const invalidTokens: string[] = [];
  const deliveryLog: PushDeliveryLogEntry[] = [];

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
        tokens: chunk.map((t) => t.token),
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
        const target = chunk[idx]!;
        if (r.success) {
          deliveryLog.push({
            deviceKey: target.deviceKey,
            platform: target.platform,
            locale: target.locale,
            tokenTail: tokenTail(target.token),
            ok: true,
            error: null,
          });
          return;
        }
        const code = r.error?.code ?? "";
        const message = r.error?.message ?? (code || "send_failed");
        deliveryLog.push({
          deviceKey: target.deviceKey,
          platform: target.platform,
          locale: target.locale,
          tokenTail: tokenTail(target.token),
          ok: false,
          error: message,
        });
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token")
        ) {
          invalidTokens.push(target.token);
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
      delivery_log: deliveryLog,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return { success, failure, deliveryLog };
}

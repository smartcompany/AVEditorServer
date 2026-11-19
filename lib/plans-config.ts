/** Editable subscription / credit plan catalog (dashboard + client source). */

export type PlanTier = "free" | "plus" | "pro" | "studio";

export type LocaleMap = {
  en: string;
  ko: string;
  ja: string;
  zh: string;
};

export type PlanConfigItem = {
  id: PlanTier;
  /** Fallback display name. */
  title: string;
  titles: LocaleMap;
  /** May include `{credits}` placeholder. */
  subtitle: LocaleMap;
  /** Each line may include `{credits}` placeholder. */
  benefits: LocaleMap[];
  editingUnlocked: boolean;
  aiEnabled: boolean;
  /** Credits granted once per calendar month while on this plan. */
  monthlyCredits: number;
};

export type PlansEconomy = {
  startingCredits: number;
  adRewardCredits: number;
};

export type PlansConfig = {
  version: number;
  economy: PlansEconomy;
  plans: PlanConfigItem[];
};

export const PLANS_CONFIG_VERSION = 1;

function L(
  en: string,
  ko: string,
  ja: string,
  zh: string,
): LocaleMap {
  return { en, ko, ja, zh };
}

/** Built-in defaults when Storage has no saved config. */
export function defaultPlansConfig(): PlansConfig {
  return {
    version: PLANS_CONFIG_VERSION,
    economy: {
      startingCredits: 100,
      adRewardCredits: 25,
    },
    plans: [
      {
        id: "free",
        title: "Free",
        titles: L("Free", "Free", "Free", "Free"),
        subtitle: L(
          "Start with ads and a small credit balance.",
          "광고와 소량 크레딧으로 시작하세요.",
          "広告と少量クレジットで始められます。",
          "从广告与少量积分开始。",
        ),
        benefits: [
          L(
            "100 starting credits",
            "시작 크레딧 100",
            "開始クレジット 100",
            "初始积分 100",
          ),
          L(
            "Earn credits by watching ads",
            "광고 시청으로 크레딧 충전",
            "広告視聴でクレジット獲得",
            "看广告获取积分",
          ),
        ],
        editingUnlocked: false,
        aiEnabled: false,
        monthlyCredits: 0,
      },
      {
        id: "plus",
        title: "Plus",
        titles: L("Plus", "Plus", "Plus", "Plus"),
        subtitle: L(
          "{credits} credits each month for premium effects.",
          "매월 크레딧 {credits}으로 프리미엄 효과를 쓰세요.",
          "毎月クレジット {credits} でプレミアム効果を使えます。",
          "每月 {credits} 积分，用于高级效果。",
        ),
        benefits: [
          L(
            "{credits} credits every month",
            "매월 크레딧 {credits} 지급",
            "毎月クレジット {credits} 付与",
            "每月发放 {credits} 积分",
          ),
          L(
            "All premium transitions and text effects",
            "모든 프리미엄 전환·텍스트 효과",
            "すべてのプレミアム遷移・テキスト効果",
            "全部高级转场与文字效果",
          ),
          L(
            "Spend credits to export — top up with ads anytime",
            "저장 시 크레딧 사용 · 부족하면 광고로 충전",
            "書き出しでクレジット消費 · 不足時は広告で補充",
            "导出消耗积分 · 不足时可看广告补充",
          ),
        ],
        editingUnlocked: true,
        aiEnabled: false,
        monthlyCredits: 500,
      },
      {
        id: "pro",
        title: "Pro",
        titles: L("Pro", "Pro", "Pro", "Pro"),
        subtitle: L(
          "{credits} credits each month, plus AI tools.",
          "매월 크레딧 {credits}과 AI 도구를 함께.",
          "毎月クレジット {credits} と AI ツール。",
          "每月 {credits} 积分，并解锁 AI 工具。",
        ),
        benefits: [
          L(
            "{credits} credits every month",
            "매월 크레딧 {credits} 지급",
            "毎月クレジット {credits} 付与",
            "每月发放 {credits} 积分",
          ),
          L(
            "All premium transitions and text effects",
            "모든 프리미엄 전환·텍스트 효과",
            "すべてのプレミアム遷移・テキスト効果",
            "全部高级转场与文字效果",
          ),
          L(
            "AI tools unlocked",
            "AI 도구 사용",
            "AIツールを利用可能",
            "解锁 AI 工具",
          ),
          L(
            "Spend credits to export — top up with ads anytime",
            "저장 시 크레딧 사용 · 부족하면 광고로 충전",
            "書き出しでクレジット消費 · 不足時は広告で補充",
            "导出消耗积分 · 不足时可看广告补充",
          ),
        ],
        editingUnlocked: true,
        aiEnabled: true,
        monthlyCredits: 1500,
      },
      {
        id: "studio",
        title: "Studio",
        titles: L("Studio", "Studio", "Studio", "Studio"),
        subtitle: L(
          "{credits} credits each month for heavy creators.",
          "헤비 크리에이터용 매월 크레딧 {credits}.",
          "ヘビー向け毎月クレジット {credits}。",
          "重度创作者每月 {credits} 积分。",
        ),
        benefits: [
          L(
            "{credits} credits every month",
            "매월 크레딧 {credits} 지급",
            "毎月クレジット {credits} 付与",
            "每月发放 {credits} 积分",
          ),
          L(
            "All premium transitions and text effects",
            "모든 프리미엄 전환·텍스트 효과",
            "すべてのプレミアム遷移・テキスト効果",
            "全部高级转场与文字效果",
          ),
          L(
            "AI tools unlocked",
            "AI 도구 사용",
            "AIツールを利用可能",
            "解锁 AI 工具",
          ),
          L(
            "Studio creative extras and priority access to new tools",
            "Studio 크리에이티브 추가 기능과 새 도구 우선 이용",
            "Studio向けクリエイティブ機能と新機能の優先アクセス",
            "Studio 创作扩展与新工具优先体验",
          ),
          L(
            "Spend credits to export — top up with ads anytime",
            "저장 시 크레딧 사용 · 부족하면 광고로 충전",
            "書き出しでクレジット消費 · 不足時は広告で補充",
            "导出消耗积分 · 不足时可看广告补充",
          ),
        ],
        editingUnlocked: true,
        aiEnabled: true,
        monthlyCredits: 4000,
      },
    ],
  };
}

export function monthlyCreditsFromConfig(
  config: PlansConfig,
  tier: string | null | undefined,
): number {
  const plan = config.plans.find((p) => p.id === tier);
  return plan?.monthlyCredits ?? 0;
}

export function planFromConfig(
  config: PlansConfig,
  tier: string | null | undefined,
): PlanConfigItem | undefined {
  return config.plans.find((p) => p.id === tier);
}

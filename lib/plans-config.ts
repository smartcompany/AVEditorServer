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
  /**
   * When false, the plan is hidden from the app paywall (paid tiers) and
   * treated as unavailable for new purchases. Free is the baseline state
   * for non-subscribers even if other tiers are disabled.
   */
  enabled: boolean;
  /**
   * App Store / Play Product ID for the monthly SKU (ASC 제품 ID).
   * Empty for Free. Example: com.smartcompany.aveditor.plus.monthly
   */
  storeProductIdMonthly: string;
  /** App Store / Play Product ID for the annual SKU. Empty for Free. */
  storeProductIdAnnual: string;
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
        enabled: true,
        storeProductIdMonthly: "",
        storeProductIdAnnual: "",
      },
      {
        id: "plus",
        title: "Plus",
        titles: L("Plus", "Plus", "Plus", "Plus"),
        subtitle: L(
          "Unlock Plus transitions and text effects.",
          "Plus 전환·텍스트 효과를 잠금 해제하세요.",
          "Plusの遷移・テキスト効果を解放。",
          "解锁 Plus 转场与文字效果。",
        ),
        benefits: [
          L(
            "All Plus transitions and text effects",
            "모든 Plus 전환·텍스트 효과",
            "すべての Plus 遷移・テキスト効果",
            "全部 Plus 转场与文字效果",
          ),
          L(
            "Export Plus effects with no credit cost",
            "Plus 효과 내보내기 · 크레딧 소모 없음",
            "Plus効果の書き出し · クレジット不要",
            "导出 Plus 效果 · 不消耗积分",
          ),
          L(
            "{credits} AI credits every month",
            "매월 AI 크레딧 {credits}",
            "毎月 AI クレジット {credits}",
            "每月 AI 积分 {credits}",
          ),
        ],
        editingUnlocked: true,
        aiEnabled: false,
        monthlyCredits: 500,
        enabled: true,
        storeProductIdMonthly: "com.smartcompany.aveditor.plus.monthly",
        storeProductIdAnnual: "com.smartcompany.aveditor.plus.annual",
      },
      {
        id: "pro",
        title: "Pro",
        titles: L("Pro", "Pro", "Pro", "Pro"),
        subtitle: L(
          "Plus + Pro effects, plus AI tools.",
          "Plus·Pro 효과와 AI 도구까지.",
          "Plus・Pro効果とAIツール。",
          "Plus + Pro 效果，并解锁 AI。",
        ),
        benefits: [
          L(
            "All Plus and Pro transitions and text effects",
            "모든 Plus·Pro 전환·텍스트 효과",
            "すべての Plus・Pro 遷移・テキスト効果",
            "全部 Plus 与 Pro 转场与文字效果",
          ),
          L(
            "Export paid effects with no credit cost",
            "유료 효과 내보내기 · 크레딧 소모 없음",
            "有料効果の書き出し · クレジット不要",
            "导出付费效果 · 不消耗积分",
          ),
          L(
            "AI tools unlocked",
            "AI 도구 사용",
            "AIツールを利用可能",
            "解锁 AI 工具",
          ),
          L(
            "{credits} AI credits every month",
            "매월 AI 크레딧 {credits}",
            "毎月 AI クレジット {credits}",
            "每月 AI 积分 {credits}",
          ),
        ],
        editingUnlocked: true,
        aiEnabled: true,
        monthlyCredits: 1500,
        enabled: false,
        storeProductIdMonthly: "com.smartcompany.aveditor.pro.monthly",
        storeProductIdAnnual: "com.smartcompany.aveditor.pro.annual",
      },
      {
        id: "studio",
        title: "Studio",
        titles: L("Studio", "Studio", "Studio", "Studio"),
        subtitle: L(
          "Everything in Pro, with more AI credits.",
          "Pro의 모든 기능과 더 많은 AI 크레딧.",
          "Proのすべてと、より多いAIクレジット。",
          "包含 Pro 全部功能，更多 AI 积分。",
        ),
        benefits: [
          L(
            "All Plus and Pro transitions and text effects",
            "모든 Plus·Pro 전환·텍스트 효과",
            "すべての Plus・Pro 遷移・テキスト効果",
            "全部 Plus 与 Pro 转场与文字效果",
          ),
          L(
            "Export paid effects with no credit cost",
            "유료 효과 내보내기 · 크레딧 소모 없음",
            "有料効果の書き出し · クレジット不要",
            "导出付费效果 · 不消耗积分",
          ),
          L(
            "AI tools unlocked",
            "AI 도구 사용",
            "AIツールを利用可能",
            "解锁 AI 工具",
          ),
          L(
            "{credits} AI credits every month",
            "매월 AI 크레딧 {credits}",
            "毎月 AI クレジット {credits}",
            "每月 AI 积分 {credits}",
          ),
          L(
            "Studio creative extras and priority access to new tools",
            "Studio 크리에이티브 추가 기능과 새 도구 우선 이용",
            "Studio向けクリエイティブ機能と新機能の優先アクセス",
            "Studio 创作扩展与新工具优先体验",
          ),
        ],
        editingUnlocked: true,
        aiEnabled: true,
        monthlyCredits: 4000,
        enabled: false,
        storeProductIdMonthly: "com.smartcompany.aveditor.studio.monthly",
        storeProductIdAnnual: "com.smartcompany.aveditor.studio.annual",
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

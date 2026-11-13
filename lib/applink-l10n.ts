export type ApplinkLocale = 'ko' | 'en' | 'ja' | 'zh';

export type ApplinkSocialCopy = {
  appTitle: string;
  pageTitle: string;
  metaDescription: string;
  ogDescription: string;
  inAppHint: string;
  safariHint: string;
  noscriptAppStore: string;
};

const SOCIAL_COPY: Record<ApplinkLocale, ApplinkSocialCopy> = {
  ko: {
    appTitle: "ClipGo",
    pageTitle: "ClipGo — 다운로드",
    metaDescription: "App Store 또는 Google Play에서 ClipGo를 설치하세요.",
    ogDescription: "쇼츠 편집부터 유튜브 업로드까지 한 앱에서",
    inAppHint:
      "X·카카오 등 앱 안 브라우저는 아래 버튼을 눌러 스토어로 이동해 주세요.",
    safariHint: "일반 Safari에서는 자동으로 스토어가 열릴 수 있습니다.",
    noscriptAppStore: "App Store로 이동",
  },
  en: {
    appTitle: "ClipGo",
    pageTitle: "ClipGo — Download",
    metaDescription: "Install ClipGo from the App Store or Google Play.",
    ogDescription: "Edit Shorts and upload to YouTube in one app",
    inAppHint:
      "In X, KakaoTalk, and other in-app browsers, tap a button below to open the store.",
    safariHint: "Safari and Chrome may open the store automatically.",
    noscriptAppStore: "Open in App Store",
  },
  ja: {
    appTitle: "ClipGo",
    pageTitle: "ClipGo — ダウンロード",
    metaDescription:
      "App Store または Google Play から ClipGo をインストールしてください。",
    ogDescription: "ショート編集からYouTubeアップロードまでひとつのアプリで",
    inAppHint:
      "X・カカオトークなどアプリ内ブラウザでは、下のボタンからストアを開いてください。",
    safariHint: "Safari などでは自動的にストアが開く場合があります。",
    noscriptAppStore: "App Storeを開く",
  },
  zh: {
    appTitle: "ClipGo",
    pageTitle: "ClipGo — 下载",
    metaDescription: "从 App Store 或 Google Play 安装 ClipGo。",
    ogDescription: "短视频剪辑到 YouTube 上传，一个应用搞定",
    inAppHint: "在 X、KakaoTalk 等应用内浏览器中，请点击下方按钮前往商店。",
    safariHint: "在 Safari 等浏览器中可能会自动打开商店。",
    noscriptAppStore: "打开 App Store",
  },
};

/**
 * Locale from `?lang=` (highest priority) or `Accept-Language`.
 * Supported: en (default), ko, ja, zh.
 */
export function resolveApplinkLocale(
  acceptLanguage: string | null | undefined,
  queryLang?: string | null,
): ApplinkLocale {
  const q = (queryLang ?? '').trim().toLowerCase();
  if (q === 'ko' || q.startsWith('ko-')) return 'ko';
  if (q === 'ja' || q.startsWith('ja-')) return 'ja';
  if (q === 'zh' || q.startsWith('zh-')) return 'zh';
  if (q === 'en' || q.startsWith('en-')) return 'en';

  const raw = (acceptLanguage ?? '').toLowerCase();
  for (const part of raw.split(',')) {
    const tag = part.split(';')[0]?.trim() ?? '';
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('en')) return 'en';
  }
  return 'en';
}

export function getApplinkSocialCopy(locale: ApplinkLocale): ApplinkSocialCopy {
  return SOCIAL_COPY[locale];
}

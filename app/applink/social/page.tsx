import type { Metadata } from 'next';
import { headers } from 'next/headers';

import {
  APPLINK_SOCIAL_URL,
  hasIosStoreListing,
  IOS_APP_STORE_ITMS,
  IOS_APP_STORE_WEB,
  PLAY_STORE_MARKET,
  PLAY_STORE_WEB,
} from '@/lib/applink';
import {
  getApplinkSocialCopy,
  resolveApplinkLocale,
} from '@/lib/applink-l10n';

/**
 * X·카카오·FB·인스타 등: 자동 itms 를 쓰면 WebView가 비거나 UI가 먼저 켜져
 * 하단 “받기/열기” 화면만 보이는 경우가 많다. → 인앱이면 **자동 이동 금지**, 버튼+탭만.
 * 사파리/Chrome 모바일: itms / market 즉시 시도 후 https 폴백.
 */
function buildBootScript(iosListing: boolean): string {
  if (!iosListing) {
    return `
(function () {
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  var inApp = /(Twitter|X\\/[\\d.]+|FBIOS|FBAN|FBAV|Line\\/|KakaoTalk|Kakao|Daum|KAKAOTALK|Whatsapp|Telegram|Snapchat|Slack|LinkedIn|FB_IAB|Instagram|Pinterest|musical_ly|ByteDance|Aweme|; wv\\))/i.test(ua);
  var isAndroid = /android/i.test(ua);
  var elAnd = document.getElementById("applink-btn-android");
  if (isAndroid && elAnd) { elAnd.setAttribute("href", ${JSON.stringify(PLAY_STORE_MARKET)}); }
  if (inApp) { return; }
  if (!isAndroid) { return; }
  var scheme = ${JSON.stringify(PLAY_STORE_MARKET)};
  var web = ${JSON.stringify(PLAY_STORE_WEB)};
  var t = window.setTimeout(function () { window.location.replace(web); }, 2000);
  function cancel() {
    if (t !== null) { window.clearTimeout(t); t = null; }
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) { cancel(); } });
  window.addEventListener("pagehide", cancel);
  try { window.location.href = scheme; } catch (e) { cancel(); window.location.replace(web); }
})();
`.trim();
  }

  return `
(function () {
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  var inApp = /(Twitter|X\\/[\\d.]+|FBIOS|FBAN|FBAV|Line\\/|KakaoTalk|Kakao|Daum|KAKAOTALK|Whatsapp|Telegram|Snapchat|Slack|LinkedIn|FB_IAB|Instagram|Pinterest|musical_ly|ByteDance|Aweme|; wv\\))/i.test(ua);
  var isAndroid = /android/i.test(ua);
  var isIOS = /iphone|ipad|ipod/i.test(ua);
  var elIos = document.getElementById("applink-btn-ios");
  var elAnd = document.getElementById("applink-btn-android");
  if (isIOS && elIos) { elIos.setAttribute("href", ${JSON.stringify(IOS_APP_STORE_ITMS)}); }
  if (isAndroid && elAnd) { elAnd.setAttribute("href", ${JSON.stringify(PLAY_STORE_MARKET)}); }
  if (inApp) { return; }
  if (!isAndroid && !isIOS) { return; }
  var scheme = isAndroid ? ${JSON.stringify(PLAY_STORE_MARKET)} : ${JSON.stringify(IOS_APP_STORE_ITMS)};
  var web = isAndroid ? ${JSON.stringify(PLAY_STORE_WEB)} : ${JSON.stringify(IOS_APP_STORE_WEB)};
  var t = window.setTimeout(function () { window.location.replace(web); }, 2000);
  function cancel() {
    if (t !== null) { window.clearTimeout(t); t = null; }
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) { cancel(); } });
  window.addEventListener("pagehide", cancel);
  try { window.location.href = scheme; } catch (e) { cancel(); window.location.replace(web); }
})();
`.trim();
}

const styles = {
  main: {
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    minHeight: '100dvh',
    padding:
      'max(1.5rem, env(safe-area-inset-top)) 1.5rem max(5rem, env(safe-area-inset-bottom, 32px))',
    background: '#0B0610',
    color: '#F4F1EA',
    textAlign: 'center' as const,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif',
  },
  title: { margin: 0, fontSize: '1rem', fontWeight: 600 },
  hint: {
    margin: '8px 0 0',
    maxWidth: 360,
    fontSize: 12,
    lineHeight: 1.5,
    color: '#A89BB0',
  },
  safari: {
    margin: '4px 0 16px',
    fontSize: 11,
    color: '#7d7086',
  },
  buttons: {
    display: 'flex',
    width: '100%',
    maxWidth: 360,
    flexDirection: 'column' as const,
    gap: 12,
  },
  iosBtn: {
    display: 'block',
    borderRadius: 12,
    background: '#E835C1',
    padding: '14px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    textDecoration: 'none',
  },
  androidBtn: {
    display: 'block',
    borderRadius: 12,
    border: '1px solid #3a2f45',
    background: '#1E1628',
    padding: '14px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#F4F1EA',
    textDecoration: 'none',
  },
  noscriptLink: { color: '#E835C1' },
};

async function resolvePageLocale(queryLang?: string | null) {
  const h = await headers();
  return resolveApplinkLocale(h.get('accept-language'), queryLang);
}

type PageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = await resolvePageLocale(lang);
  const copy = getApplinkSocialCopy(locale);
  return {
    title: copy.pageTitle,
    description: copy.metaDescription,
    robots: { index: false, follow: false },
    openGraph: {
      title: copy.appTitle,
      description: copy.ogDescription,
      url: APPLINK_SOCIAL_URL,
      locale:
        locale === 'ko'
          ? 'ko_KR'
          : locale === 'ja'
            ? 'ja_JP'
            : locale === 'zh'
              ? 'zh_CN'
              : 'en_US',
    },
  };
}

export default async function AppLinkSocialPage({ searchParams }: PageProps) {
  const { lang } = await searchParams;
  const locale = await resolvePageLocale(lang);
  const copy = getApplinkSocialCopy(locale);
  const iosListing = hasIosStoreListing();
  const bootScript = buildBootScript(iosListing);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      <main style={styles.main} lang={locale}>
        <p style={styles.title}>{copy.appTitle}</p>
        <p style={styles.hint}>{copy.inAppHint}</p>
        <p style={styles.safari}>{copy.safariHint}</p>
        <div style={styles.buttons}>
          {iosListing ? (
            <a id="applink-btn-ios" href={IOS_APP_STORE_WEB} style={styles.iosBtn}>
              App Store
            </a>
          ) : null}
          <a
            id="applink-btn-android"
            href={PLAY_STORE_WEB}
            style={styles.androidBtn}
          >
            Google Play
          </a>
        </div>
        {iosListing ? (
          <noscript>
            <p>
              <a href={IOS_APP_STORE_WEB} style={styles.noscriptLink}>
                {copy.noscriptAppStore}
              </a>
            </p>
          </noscript>
        ) : null}
      </main>
    </>
  );
}

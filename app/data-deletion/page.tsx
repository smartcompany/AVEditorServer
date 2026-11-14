import type { Metadata } from "next";
import { Section, SiteShell, s } from "../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `사용자 데이터 삭제 · Data Deletion — ${SITE.appName}`,
};

const link = { color: "#4cc9f0" };

export default function DataDeletionPage() {
  const contact = SITE.supportEmail || "(문의 이메일 / contact email)";
  return (
    <SiteShell>
      <h1 style={s.h1}>사용자 데이터 삭제</h1>
      <p style={s.muted}>
        Data Deletion Instructions · Facebook · 시행일 / Effective {SITE.policyDate}
      </p>

      <Section title="1. 앱이 보관하는 Facebook 데이터">
        <p>
          {SITE.appName}는 Facebook 로그인 계정, 친구 목록, 게시물 내용을 서버에 저장하지 않습니다.
          Facebook으로 영상을 공유할 때는 기기의 Facebook 앱/SDK를 통해 사용자가 직접 게시하며, 그
          과정에서 생긴 Facebook 쪽 데이터는 Facebook이 관리합니다.
        </p>
      </Section>

      <Section title="2. 기기에서 삭제하는 방법">
        <ul>
          <li>
            앱을 삭제하면 기기에 저장된 편집 프로젝트·캐시·로컬 토큰이 함께 제거됩니다.
          </li>
          <li>
            iOS: 설정 → {SITE.appName} → 권한/데이터, 또는 홈 화면에서 앱 삭제.
          </li>
          <li>
            Android: 설정 → 앱 → {SITE.appName} → 저장공간에서 데이터 삭제, 또는 앱 삭제.
          </li>
        </ul>
      </Section>

      <Section title="3. Facebook에서 앱 연결 해제">
        <p>
          Facebook 설정에서 앱 권한을 끊을 수 있습니다.{" "}
          <a href="https://www.facebook.com/settings?tab=applications" style={link}>
            Facebook → 설정 → 앱 및 웹사이트
          </a>
          에서 {SITE.appName}를 찾아 제거하세요. Facebook이 데이터 삭제를 요청하면 저희 콜백이
          확인 코드를 발급합니다.
        </p>
      </Section>

      <Section title="4. 삭제 요청 / 문의">
        <p>
          추가로 삭제가 필요하면{" "}
          <a href={`mailto:${contact}?subject=${encodeURIComponent(`${SITE.appName} data deletion`)}`} style={link}>
            {contact}
          </a>
          로 Facebook 사용자 ID(알 경우)와 함께 메일을 보내 주세요. 영업일 기준 30일 이내에
          처리합니다. {SITE.appName} 서버에는 삭제할 Facebook 계정 데이터가 없는 경우가 대부분이며,
          그 경우에도 요청 접수 확인을 회신합니다.
        </p>
      </Section>

      <Section title="5. Data deletion (English)">
        <p>
          {SITE.appName} does not store Facebook account data on its servers. Sharing uses the
          on-device Facebook SDK. Uninstall the app to clear local projects, and remove the app under{" "}
          <a href="https://www.facebook.com/settings?tab=applications" style={link}>
            Facebook → Settings → Apps and Websites
          </a>
          . Email {contact} for a deletion confirmation. Facebook-initiated deletion callbacks
          receive a confirmation code and status URL.
        </p>
      </Section>
    </SiteShell>
  );
}

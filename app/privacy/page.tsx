import type { Metadata } from "next";
import { Section, SiteShell, s } from "../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `개인정보처리방침 · Privacy Policy — ${SITE.appName}`,
};

const link = { color: "#4cc9f0" };

export default function PrivacyPage() {
  const contact = SITE.supportEmail || "(문의 이메일 / contact email)";
  return (
    <SiteShell>
      <h1 style={s.h1}>개인정보처리방침</h1>
      <p style={s.muted}>Privacy Policy · 시행일 / Effective {SITE.policyDate}</p>

      <Section title="1. 개요">
        <p>
          {SITE.appName}(이하 &ldquo;앱&rdquo;)는 사용자의 개인정보를 최소한으로만 다룹니다. 편집하는 영상과
          프로젝트는 사용자의 기기 안에만 저장되며, 앱 서버로 업로드되지 않습니다.
        </p>
      </Section>

      <Section title="2. Google 계정 및 YouTube 데이터">
        <ul>
          <li>
            사용자가 &ldquo;YouTube 업로드&rdquo;를 선택하면 Google 로그인을 통해 YouTube 업로드 권한
            (<code>https://www.googleapis.com/auth/youtube.upload</code>)을 요청합니다.
          </li>
          <li>
            이 권한은 사용자가 고른 영상을 사용자가 입력한 제목·설명·태그·공개 범위·썸네일·재생목록
            설정과 함께 <strong>사용자 본인의 YouTube 채널에 업로드하는 데에만</strong> 사용합니다.
          </li>
          <li>
            업로드와 관련된 요청은 사용자의 기기에서 Google(YouTube Data API)로 직접 전송됩니다.
            Google 계정 정보, 액세스 토큰, 채널 정보는 앱 서버로 전송되거나 저장되지 않으며, 제3자에게
            제공·판매되지 않습니다. 광고 목적으로 사용하지 않습니다.
          </li>
          <li>
            {SITE.appName}의 Google API에서 받은 정보의 사용 및 다른 앱으로의 전송은{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" style={link}>
              Google API Services User Data Policy
            </a>
            의 제한적 사용(Limited Use) 요구사항을 포함하여 이를 준수합니다.
          </li>
          <li>
            앱은 YouTube API 서비스를 사용합니다. YouTube 이용 시{" "}
            <a href="https://www.youtube.com/t/terms" style={link}>
              YouTube 서비스 약관
            </a>
            과{" "}
            <a href="https://policies.google.com/privacy" style={link}>
              Google 개인정보처리방침
            </a>
            이 적용됩니다.
          </li>
          <li>
            권한 철회: 앱 설정의 YouTube 로그아웃, 또는{" "}
            <a href="https://myaccount.google.com/permissions" style={link}>
              Google 계정 → 타사 앱 액세스
            </a>
            에서 언제든 앱의 접근 권한을 해제할 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section title="3. 사용 통계 (익명)">
        <p>
          앱 개선을 위해 다음 익명 정보를 앱 서버로 보냅니다: 기기마다 무작위로 만든 설치 ID, 운영체제
          종류(iOS/Android), 앱 버전, 사용 이벤트 이름(예: 앱 실행, 편집 화면 진입, 내보내기 완료, Pro
          선택 화면 노출과 선택 결과), 사용한 효과의 ID. 이름, 이메일, 연락처, 영상·텍스트 내용,
          Google 계정 정보는 수집하지 않습니다. 이 정보는 집계 통계에만 쓰이며, 최대 2년 보관 후
          삭제합니다.
        </p>
      </Section>

      <Section title="4. 광고">
        <p>
          무료 사용자가 Pro 효과를 한 번 쓰기 위해 광고 보기를 선택하면 Google AdMob 광고가 표시됩니다.
          AdMob은 광고 제공과 측정을 위해 광고 식별자 등 기기 정보를 사용할 수 있으며, 이는{" "}
          <a href="https://policies.google.com/technologies/ads" style={link}>
            Google 광고 정책
          </a>
          을 따릅니다. 기기 설정에서 광고 개인화를 끌 수 있습니다.
        </p>
      </Section>

      <Section title="5. 결제 (Pro 구독)">
        <p>
          구독 결제는 App Store 또는 Google Play가 처리하며, 앱은 카드 정보 등 결제 정보를 받지 않습니다.
          구독 상태 확인을 위해 RevenueCat이 익명 사용자 ID와 구매 기록을 처리합니다. 구독 해지는 각
          스토어의 계정 설정에서 할 수 있습니다.
        </p>
      </Section>

      <Section title="6. 효과·음악 카탈로그와 음악 검색">
        <p>
          앱은 전환 효과, 텍스트 템플릿, 음악 목록을 앱 서버에서 내려받습니다. 음악 검색 시 입력한
          검색어가 앱 서버와 음악 제공처(Jamendo, Pixabay)로 전송됩니다. 이 과정에서 개인정보는 보내지
          않습니다.
        </p>
      </Section>

      <Section title="7. 보관과 삭제">
        <p>
          영상·프로젝트는 기기에 저장되며 앱 안에서 삭제하거나 앱을 지우면 함께 삭제됩니다. 익명 사용
          통계 삭제를 원하시면 아래 연락처로 요청해 주세요.
        </p>
      </Section>

      <Section title="8. 아동">
        <p>앱은 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 의도적으로 수집하지 않습니다.</p>
      </Section>

      <Section title="9. 변경과 문의">
        <p>
          이 방침이 바뀌면 이 페이지에 게시하고 시행일을 갱신합니다. 문의: {contact}
        </p>
      </Section>

      <hr style={{ border: 0, borderTop: "1px solid #2a3142", margin: "40px 0 8px" }} />

      <h1 style={s.h1}>Privacy Policy (English)</h1>
      <p style={s.muted}>Effective {SITE.policyDate}</p>
      <Section title="Google account and YouTube data">
        <p>
          When you choose to upload to YouTube, the app asks for the YouTube upload scope
          (<code>youtube.upload</code>) via Google Sign-In. It is used only to upload the video you
          picked, with the title, description, tags, privacy setting, thumbnail and playlist you
          chose, to your own YouTube channel. Requests go directly from your device to the YouTube
          Data API; your Google account data, access tokens and channel data are not sent to or
          stored on our servers, are not sold or shared with third parties, and are not used for
          advertising. {SITE.appName}&apos;s use and transfer of information received from Google APIs
          adheres to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" style={link}>
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. The app uses YouTube API Services; the{" "}
          <a href="https://www.youtube.com/t/terms" style={link}>YouTube Terms of Service</a> and{" "}
          <a href="https://policies.google.com/privacy" style={link}>Google Privacy Policy</a> apply.
          You can revoke access any time in the app or at{" "}
          <a href="https://myaccount.google.com/permissions" style={link}>
            myaccount.google.com/permissions
          </a>
          .
        </p>
      </Section>
      <Section title="Other data">
        <p>
          Your videos and projects stay on your device. For product improvement the app sends
          anonymous usage events (a random install ID, platform, app version, event names and the
          IDs of effects used) to our server; no name, email, contacts, video or text content, or
          Google account data. Ads (Google AdMob) are shown only when a free user chooses to watch
          one, and may use device advertising identifiers under Google&apos;s ad policies.
          Subscriptions are billed by the App Store or Google Play; RevenueCat processes an anonymous
          user ID and purchase records to check subscription status. Music search terms are sent to
          our server and the music providers. The app is not directed at children under 14.
          Contact: {contact}
        </p>
      </Section>
    </SiteShell>
  );
}

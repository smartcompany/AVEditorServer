import type { Metadata } from "next";
import { Section, SiteShell, s } from "../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `YouTube OAuth · ${SITE.appName}`,
};

const link = { color: "#4cc9f0" };
const code = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  background: "#1a2030",
  padding: "2px 6px",
  borderRadius: 4,
} as const;

/**
 * Public checklist for the “unverified app” Google OAuth warning when
 * uploading Shorts. Linked from the EasyClip YouTube upload screen.
 */
export default function YouTubeOAuthPage() {
  return (
    <SiteShell>
      <h1 style={s.h1}>YouTube 로그인 · “확인되지 않은 앱”</h1>
      <p style={s.muted}>
        Google OAuth consent screen · EasyClip · {SITE.policyDate}
      </p>

      <Section title="사용자에게 보이는 경우">
        <ol>
          <li>
            경고에서 <strong>고급</strong> → <strong>EasyClip(으)로 이동</strong>을
            누릅니다.
          </li>
          <li>
            그래도 안 되면, 개발자가 Google Cloud{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials/consent?project=aveditor-shorts"
              style={link}
            >
              OAuth 동의 화면
            </a>
            의 <strong>테스트 사용자</strong>에 해당 Google 계정을 추가해야 합니다.
          </li>
        </ol>
      </Section>

      <Section title="개발자 체크리스트">
        <ul>
          <li>
            프로젝트: <code style={code}>aveditor-shorts</code> (
            <code style={code}>800175376935</code>)
          </li>
          <li>
            Scope: <code style={code}>youtube.upload</code>
            {" · "}
            <code style={code}>youtube</code> (재생목록·연령제한 시)
          </li>
          <li>
            개인정보처리방침:{" "}
            <a href={`${SITE.origin}/privacy`} style={link}>
              {SITE.origin}/privacy
            </a>
          </li>
          <li>
            이용약관:{" "}
            <a href={`${SITE.origin}/terms`} style={link}>
              {SITE.origin}/terms
            </a>
          </li>
          <li>
            로고 업로드 후 반드시 <strong>Verify Branding</strong> → 상태가 Ready
            to publish이면 <strong>Publish branding</strong>. 로고만 올리면
            “브랜딩이 표시되지 않습니다”가 납니다.
          </li>
          <li>
            홈페이지(
            <a href={SITE.origin} style={link}>
              {SITE.origin}
            </a>
            )에 앱 이름 EasyClip과 동일 로고가 보여야 합니다. 배포 후 다시
            Verify.
          </li>
          <li>
            공개 배포 전: 동의 화면을 <strong>프로덕션</strong>으로 게시한 뒤
            민감 scope <strong>앱 검증</strong>을 제출합니다. 통과 전까지는
            테스트 사용자만 로그인할 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section title="For reviewers (English)">
        <p>
          EasyClip uploads an on-device export to the signed-in user&apos;s YouTube
          channel via <code style={code}>youtube.upload</code>. Playlist / age
          restriction use <code style={code}>youtube</code> only when the user
          opts in. Tokens stay on device. Privacy:{" "}
          <a href={`${SITE.origin}/privacy`} style={link}>
            {SITE.origin}/privacy
          </a>
          . Support: {SITE.supportEmail}.
        </p>
      </Section>
    </SiteShell>
  );
}

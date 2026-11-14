import type { Metadata } from "next";
import { Section, SiteShell, s } from "../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `이용약관 · Terms of Service — ${SITE.appName}`,
};

const link = { color: "#4cc9f0" };

export default function TermsPage() {
  const contact = SITE.supportEmail || "(문의 이메일 / contact email)";
  return (
    <SiteShell>
      <h1 style={s.h1}>이용약관</h1>
      <p style={s.muted}>Terms of Service · 시행일 / Effective {SITE.policyDate}</p>

      <Section title="1. 서비스">
        <p>
          {SITE.appName}는 동영상 편집과 YouTube 업로드 기능을 제공하는 모바일 앱입니다. 앱을 설치하거나
          사용하면 이 약관에 동의한 것으로 봅니다.
        </p>
      </Section>
      <Section title="2. 사용자 콘텐츠">
        <p>
          편집·업로드하는 영상, 음악, 텍스트에 대한 권리와 책임은 사용자에게 있습니다. 타인의 저작권,
          초상권 등 권리를 침해하는 콘텐츠를 만들거나 올려서는 안 됩니다.
        </p>
      </Section>
      <Section title="3. YouTube 업로드">
        <p>
          YouTube에 업로드하는 경우{" "}
          <a href="https://www.youtube.com/t/terms" style={link}>
            YouTube 서비스 약관
          </a>
          과 커뮤니티 가이드가 적용됩니다. 업로드된 영상의 관리 책임은 사용자에게 있습니다.
        </p>
      </Section>
      <Section title="4. Pro 구독과 광고">
        <p>
          일부 효과는 Pro 구독 또는 광고 시청으로 사용할 수 있습니다. 구독은 기간 종료 시 자동 갱신되며
          App Store / Google Play 계정 설정에서 언제든 해지할 수 있습니다. 환불은 각 스토어의 정책을
          따릅니다. 제공되는 효과와 혜택은 서비스 개선에 따라 바뀔 수 있습니다.
        </p>
      </Section>
      <Section title="5. 책임의 한계">
        <p>
          앱은 &ldquo;있는 그대로&rdquo; 제공됩니다. 관련 법령이 허용하는 범위에서, 기기 저장 공간 부족,
          외부 서비스(YouTube, 스토어 등)의 장애로 인한 손실이나 데이터 유실에 대해 책임을 지지
          않습니다. 중요한 영상은 별도로 백업해 주세요.
        </p>
      </Section>
      <Section title="6. 변경과 준거법">
        <p>
          약관이 바뀌면 이 페이지에 게시합니다. 이 약관은 대한민국 법을 따릅니다. 문의: {contact}
        </p>
      </Section>

      <hr style={{ border: 0, borderTop: "1px solid #2a3142", margin: "40px 0 8px" }} />
      <h1 style={s.h1}>Terms of Service (English)</h1>
      <Section title="Summary">
        <p>
          By using {SITE.appName} you agree to these terms. You own and are responsible for the
          content you edit and upload, and must not infringe others&apos; rights. Uploads to YouTube
          are governed by the{" "}
          <a href="https://www.youtube.com/t/terms" style={link}>YouTube Terms of Service</a>. Pro
          subscriptions renew automatically and can be cancelled in your App Store / Google Play
          account; refunds follow the store&apos;s policy. The app is provided &ldquo;as is&rdquo; to the
          extent permitted by law. These terms are governed by the laws of the Republic of Korea.
          Contact: {contact}
        </p>
      </Section>
    </SiteShell>
  );
}

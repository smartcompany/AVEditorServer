import type { Metadata } from "next";
import Link from "next/link";
import { Section, SiteShell, s } from "./site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE.appName} — 쇼츠 편집부터 유튜브 업로드까지`,
  description:
    "ClipGo는 휴대폰에서 영상을 자르고 텍스트·전환 효과·음악을 넣어 유튜브 쇼츠로 바로 올리는 동영상 편집 앱입니다.",
};

/** App homepage (also the homepage URL for Google OAuth verification). */
export default function HomePage() {
  return (
    <SiteShell>
      <h1 style={s.h1}>쇼츠 편집부터 유튜브 업로드까지, 한 앱에서</h1>
      <p style={s.body}>
        {SITE.appName}는 휴대폰에서 영상을 자르고, 텍스트·전환 효과·음악을 넣어 유튜브 쇼츠로
        바로 올릴 수 있는 동영상 편집 앱입니다.
      </p>
      <p style={s.muted}>
        {SITE.appName} is a mobile video editor for making YouTube Shorts: trim clips, add text,
        transitions and music, then upload to your own YouTube channel.
      </p>

      <Section title="주요 기능 · Features">
        <ul>
          <li>영상 자르기·나누기, 클립 사이 전환 효과</li>
          <li>텍스트 효과와 애니메이션 텍스트 템플릿</li>
          <li>배경 음악 추가</li>
          <li>세로형(9:16) 쇼츠로 내보내기와 기기 저장</li>
          <li>
            <strong>유튜브 업로드</strong>: 사용자가 직접 Google 계정으로 로그인해, 편집한 영상을 본인
            채널에 쇼츠로 올립니다.
          </li>
        </ul>
      </Section>

      <Section title="Google 계정 / YouTube 데이터 사용 · Use of Google data">
        <p>
          {SITE.appName}는 사용자가 업로드를 선택했을 때만 YouTube 업로드 권한
          (<code>youtube.upload</code>)을 요청합니다. 이 권한은 사용자가 고른 영상과 사용자가 입력한
          제목·설명·공개 범위 등으로 <strong>사용자 본인의 채널에 영상을 올리는 데에만</strong>{" "}
          사용합니다. 업로드는 사용자의 기기에서 YouTube로 직접 이루어지며, Google 계정 데이터는
          {" "}{SITE.appName} 서버로 전송·저장되지 않습니다.
        </p>
        <p style={s.muted}>
          The app requests the YouTube upload scope only when you choose to upload, and uses it
          only to upload the video you picked, with the details you entered, to your own channel,
          directly from your device. Google account data is not sent to or stored on our servers.
          See the <Link href="/privacy" style={{ color: "#4cc9f0" }}>Privacy Policy</Link>.
        </p>
      </Section>

      <Section title="다운로드 · Download">
        <p>
          <a href={SITE.playStoreUrl} style={{ color: "#4cc9f0" }}>
            Google Play
          </a>
        </p>
      </Section>
    </SiteShell>
  );
}

import type { Metadata } from "next";
import { Section, SiteShell, s } from "../../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `데이터 삭제 요청 상태 · Deletion Status — ${SITE.appName}`,
};

type Props = {
  searchParams: Promise<{ code?: string }>;
};

export default async function DataDeletionStatusPage({ searchParams }: Props) {
  const { code } = await searchParams;
  const confirmation = (code ?? "").trim();

  return (
    <SiteShell>
      <h1 style={s.h1}>데이터 삭제 요청 상태</h1>
      <p style={s.muted}>Facebook Data Deletion Status · {SITE.appName}</p>

      <Section title="요청 결과">
        {confirmation ? (
          <>
            <p>
              확인 코드 / Confirmation code:{" "}
              <code style={{ color: "#4cc9f0" }}>{confirmation}</code>
            </p>
            <p>
              이 요청은 접수되었습니다. {SITE.appName}는 Facebook 계정 정보를 서버에 보관하지
              않으므로, 서버 측에서 삭제할 Facebook 사용자 데이터는 없습니다. 기기의 앱 데이터는
              앱 삭제 또는 설정에서 직접 지우실 수 있습니다.
            </p>
            <p style={s.muted}>
              This request was acknowledged. {SITE.appName} does not retain Facebook account data
              on its servers, so there is nothing further to erase server-side.
            </p>
          </>
        ) : (
          <p>
            확인 코드가 없습니다. Facebook에서 삭제를 요청했거나{" "}
            <a href="/data-deletion" style={{ color: "#4cc9f0" }}>
              삭제 안내 페이지
            </a>
            를 확인해 주세요.
          </p>
        )}
      </Section>

      <Section title="문의">
        <p>
          추가 문의:{" "}
          <a href={`mailto:${SITE.supportEmail}`} style={{ color: "#4cc9f0" }}>
            {SITE.supportEmail}
          </a>
        </p>
      </Section>
    </SiteShell>
  );
}

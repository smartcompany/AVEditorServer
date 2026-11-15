import type { Metadata } from "next";
import { Section, SiteShell, s } from "../../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Deletion Status — ${SITE.appName}`,
};

type Props = {
  searchParams: Promise<{ code?: string }>;
};

export default async function DataDeletionStatusPage({ searchParams }: Props) {
  const { code } = await searchParams;
  const confirmation = (code ?? "").trim();

  return (
    <SiteShell>
      <h1 style={s.h1}>Data deletion status</h1>
      <p style={s.muted}>Facebook data deletion status · {SITE.appName}</p>

      <Section title="Request result">
        {confirmation ? (
          <>
            <p>
              Confirmation code:{" "}
              <code style={{ color: "#4cc9f0" }}>{confirmation}</code>
            </p>
            <p>
              This request was acknowledged. {SITE.appName} does not retain
              Facebook account data on its servers, so there is nothing further to
              erase server-side. You can clear on-device app data by uninstalling the
              app or clearing it in system settings.
            </p>
          </>
        ) : (
          <p>
            No confirmation code was provided. If you requested deletion from
            Facebook, check the{" "}
            <a href="/data-deletion" style={{ color: "#4cc9f0" }}>
              data deletion instructions
            </a>
            .
          </p>
        )}
      </Section>

      <Section title="Contact">
        <p>
          Questions:{" "}
          <a href={`mailto:${SITE.supportEmail}`} style={{ color: "#4cc9f0" }}>
            {SITE.supportEmail}
          </a>
        </p>
      </Section>
    </SiteShell>
  );
}

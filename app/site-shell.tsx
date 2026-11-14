import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SITE } from "@/lib/site";

/** Shared frame for the public pages (landing / privacy / terms). */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/" style={s.brand}>
          {SITE.appName}
        </Link>
        <nav style={s.nav}>
          <Link href="/privacy" style={s.navLink}>
            개인정보처리방침 · Privacy
          </Link>
          <Link href="/terms" style={s.navLink}>
            이용약관 · Terms
          </Link>
          <Link href="/data-deletion" style={s.navLink}>
            데이터 삭제 · Data deletion
          </Link>
        </nav>
      </header>
      <main style={s.main}>{children}</main>
      <footer style={s.footer}>
        © 2026 {SITE.appName}
        {SITE.supportEmail ? (
          <>
            {" · "}
            <a href={`mailto:${SITE.supportEmail}`} style={s.navLink}>
              {SITE.supportEmail}
            </a>
          </>
        ) : null}
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={s.h2}>{title}</h2>
      <div style={s.body}>{children}</div>
    </section>
  );
}

export const s: Record<string, CSSProperties> = {
  page: { maxWidth: 760, margin: "0 auto", padding: "24px 16px 64px", lineHeight: 1.65 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    paddingBottom: 16,
    borderBottom: "1px solid #2a3142",
  },
  brand: { fontSize: 20, fontWeight: 800, color: "#f4f6fb", textDecoration: "none" },
  nav: { display: "flex", gap: 16, flexWrap: "wrap" },
  navLink: { color: "#b7bfcf", fontSize: 13, textDecoration: "none" },
  main: { paddingTop: 8 },
  h1: { fontSize: 30, margin: "28px 0 8px", lineHeight: 1.25 },
  h2: { fontSize: 18, margin: "0 0 8px" },
  body: { color: "#d7dceb", fontSize: 15 },
  muted: { color: "#8b93a7", fontSize: 13 },
  footer: {
    marginTop: 48,
    paddingTop: 16,
    borderTop: "1px solid #2a3142",
    color: "#8b93a7",
    fontSize: 13,
  },
};

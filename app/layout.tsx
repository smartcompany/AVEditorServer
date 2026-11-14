import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ClipGo",
  description: "ClipGo — 쇼츠 편집부터 유튜브 업로드까지",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0b0d12",
          color: "#f4f6fb",
        }}
      >
        {children}
      </body>
    </html>
  );
}

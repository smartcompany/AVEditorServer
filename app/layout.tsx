import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EasyClip",
  description: "EasyClip — Edit Shorts and upload to YouTube",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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

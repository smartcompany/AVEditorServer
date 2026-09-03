const endpoints = [
  { path: "/api/health", desc: "Health check" },
  { path: "/catalog.json", desc: "Word Art pack catalog (Flutter base URL + catalog.json)" },
  { path: "/text_packs/catalog.json", desc: "Same catalog (alias)" },
  { path: "/text_packs/lottie/hearts.json", desc: "Sample Lottie: Hearts" },
  { path: "/text_packs/lottie/burst.json", desc: "Sample Lottie: BAM" },
  { path: "/text_packs/lottie/glow_spark.json", desc: "Sample Lottie: Spark" },
];

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px 80px",
      }}
    >
      <p
        style={{
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#8b93a7",
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        AVEditor
      </p>
      <h1 style={{ fontSize: 36, margin: "0 0 12px" }}>Text pack API</h1>
      <p style={{ color: "#b7bfcf", lineHeight: 1.6, marginBottom: 32 }}>
        Next.js service for CapCut-style Word Art packs. Deploy on Vercel, then
        point the Flutter client{" "}
        <code style={codeStyle}>TextTemplatePackService</code> remote base URL
        at this origin.
      </p>

      <section
        style={{
          background: "#151923",
          border: "1px solid #2a3142",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 16px" }}>Endpoints</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {endpoints.map((item) => (
            <li
              key={item.path}
              style={{
                display: "grid",
                gap: 4,
                padding: "12px 0",
                borderTop: "1px solid #2a3142",
              }}
            >
              <a
                href={item.path}
                style={{ color: "#ff6b6b", textDecoration: "none" }}
              >
                <code style={codeStyle}>{item.path}</code>
              </a>
              <span style={{ color: "#8b93a7", fontSize: 14 }}>{item.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Flutter setup</h2>
        <pre
          style={{
            background: "#151923",
            border: "1px solid #2a3142",
            borderRadius: 12,
            padding: 16,
            overflow: "auto",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >{`await TextTemplatePackService.instance.setRemoteBaseUrl(
  'https://YOUR_PROJECT.vercel.app/',
);`}</pre>
      </section>
    </main>
  );
}

const codeStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
};

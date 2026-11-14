/**
 * TikTok Share Kit redirect target.
 *
 * Normally iOS opens the app directly (universal link). When the link lands
 * in Safari instead (universal link not yet verified on the device, or the
 * user once chose "open in Safari"), this page forwards TikTok's result to the
 * app through its custom scheme so the share result is not lost.
 */
export const metadata = { title: "EasyClip", robots: { index: false } };

/** Must match CFBundleURLSchemes in ios/Runner/Info.plist. */
const APP_SCHEME = "easyclipshare://tiktok/callback";

const bounceScript = `
(function () {
  var target = ${JSON.stringify(APP_SCHEME)} + window.location.search;
  var link = document.getElementById("open-app");
  if (link) link.setAttribute("href", target);
  window.location.replace(target);
})();
`;

export default function TikTokCallbackPage() {
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "48px 24px",
        textAlign: "center",
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>EasyClip</h1>
      <p style={{ margin: "0 0 24px", color: "#555" }}>
        앱으로 돌아가는 중이에요… / Returning to the app…
      </p>
      <a
        id="open-app"
        href={APP_SCHEME}
        style={{
          display: "inline-block",
          padding: "12px 22px",
          borderRadius: 12,
          background: "#e535c0",
          color: "#fff",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        EasyClip 열기 / Open EasyClip
      </a>
      <script dangerouslySetInnerHTML={{ __html: bounceScript }} />
    </main>
  );
}

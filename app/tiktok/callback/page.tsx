/**
 * TikTok Share Kit redirect target. On iPhones with the app installed iOS
 * opens the app directly (universal link); this page only shows when the
 * link is opened in a browser instead.
 */
export const metadata = { title: "EasyClip", robots: { index: false } };

export default function TikTokCallbackPage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center" }}>
      <h1 style={{ fontSize: 20 }}>EasyClip</h1>
      <p>앱으로 돌아가 주세요. / Please return to the app.</p>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Section, SiteShell, s } from "./site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE.appName} — Edit Shorts and upload to YouTube`,
  description:
    "EasyClip is a mobile video editor for trimming clips, adding text, transitions and music, then uploading YouTube Shorts to your own channel.",
};

/** App homepage (also the homepage URL for Google OAuth verification). */
export default function HomePage() {
  return (
    <SiteShell>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 28,
          marginBottom: 8,
        }}
      >
        {/* Same mark as OAuth consent logo — brand verification matches homepage. */}
        <img
          src="/easyclip-oauth-logo-120.png"
          width={72}
          height={72}
          alt="EasyClip"
          style={{ borderRadius: 16, flexShrink: 0 }}
        />
        <h1 style={{ ...s.h1, margin: 0 }}>EasyClip</h1>
      </div>
      <p style={{ ...s.body, fontSize: 18, fontWeight: 600, marginTop: 0 }}>
        Edit Shorts and upload to YouTube — in one app
      </p>
      <p style={s.body}>
        {SITE.appName} is a mobile video editor for making YouTube Shorts: trim
        clips, add text, transitions and music, then upload to your own YouTube
        channel.
      </p>

      <Section title="Features">
        <ul>
          <li>Trim and split clips, with transitions between clips</li>
          <li>Text effects and animated text templates</li>
          <li>Background music</li>
          <li>Export vertical (9:16) Shorts and save to the device</li>
          <li>
            <strong>YouTube upload</strong>: sign in with your own Google
            account and publish the edited video as a Short on your channel
          </li>
        </ul>
      </Section>

      <Section title="Use of Google / YouTube data">
        <p>
          {SITE.appName} requests YouTube upload permission (
          <code>youtube.upload</code>) only when you choose to upload. That
          scope is used only to upload the video you selected, with the title,
          description, and privacy status you enter, to{" "}
          <strong>your own channel</strong>. Upload goes directly from your
          device to YouTube; Google account data is not sent to or stored on{" "}
          {SITE.appName} servers. See the{" "}
          <Link href="/privacy" style={{ color: "#4cc9f0" }}>
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section title="Download">
        <p>
          <a href={SITE.playStoreUrl} style={{ color: "#4cc9f0" }}>
            Google Play
          </a>
        </p>
      </Section>
    </SiteShell>
  );
}

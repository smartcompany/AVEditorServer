import type { Metadata } from "next";
import { Section, SiteShell, s } from "../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `YouTube OAuth · ${SITE.appName}`,
};

const link = { color: "#4cc9f0" };
const code = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  background: "#1a2030",
  padding: "2px 6px",
  borderRadius: 4,
} as const;

/**
 * Public checklist for the “unverified app” Google OAuth warning when
 * uploading Shorts. Linked from the EasyClip YouTube upload screen.
 */
export default function YouTubeOAuthPage() {
  return (
    <SiteShell>
      <h1 style={s.h1}>YouTube sign-in · “unverified app”</h1>
      <p style={s.muted}>
        Google OAuth consent screen · EasyClip · {SITE.policyDate}
      </p>

      <Section title="If you see the warning">
        <ol>
          <li>
            On the warning screen, tap <strong>Advanced</strong> →{" "}
            <strong>Go to EasyClip</strong>.
          </li>
          <li>
            If that still fails, the developer must add your Google account under{" "}
            <strong>Test users</strong> on the Google Cloud{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials/consent?project=aveditor-shorts"
              style={link}
            >
              OAuth consent screen
            </a>
            .
          </li>
        </ol>
      </Section>

      <Section title="Developer checklist">
        <ul>
          <li>
            Project: <code style={code}>aveditor-shorts</code> (
            <code style={code}>800175376935</code>)
          </li>
          <li>
            Scope: <code style={code}>youtube.upload</code> only
          </li>
          <li>
            Privacy Policy:{" "}
            <a href={`${SITE.origin}/privacy`} style={link}>
              {SITE.origin}/privacy
            </a>
          </li>
          <li>
            Terms of Service:{" "}
            <a href={`${SITE.origin}/terms`} style={link}>
              {SITE.origin}/terms
            </a>
          </li>
          <li>
            After uploading the logo, run <strong>Verify Branding</strong>, then{" "}
            <strong>Publish branding</strong> when status is Ready to publish.
            Uploading a logo alone leaves branding unpublished.
          </li>
          <li>
            The homepage (
            <a href={SITE.origin} style={link}>
              {SITE.origin}
            </a>
            ) must show the app name EasyClip and the same logo. Re-verify after
            deploy.
          </li>
          <li>
            Before public release: publish the consent screen to{" "}
            <strong>Production</strong>, then submit{" "}
            <strong>app verification</strong> for sensitive scopes. Until
            approved, only test users can complete sign-in without the warning.
          </li>
        </ul>
      </Section>

      <Section title="For reviewers">
        <p>
          EasyClip uploads an on-device export to the signed-in user&apos;s YouTube
          channel via <code style={code}>youtube.upload</code> only. Tokens stay
          on device. Privacy:{" "}
          <a href={`${SITE.origin}/privacy`} style={link}>
            {SITE.origin}/privacy
          </a>
          . Support: {SITE.supportEmail}.
        </p>
      </Section>
    </SiteShell>
  );
}

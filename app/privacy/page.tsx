import type { Metadata } from "next";
import { Section, SiteShell, s } from "../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE.appName}`,
};

const link = { color: "#4cc9f0" };

export default function PrivacyPage() {
  const contact = SITE.supportEmail || "(contact email)";
  return (
    <SiteShell>
      <h1 style={s.h1}>Privacy Policy</h1>
      <p style={s.muted}>Effective {SITE.policyDate}</p>

      <Section title="1. Overview">
        <p>
          {SITE.appName} (&ldquo;the app&rdquo;) handles personal data as little as
          possible. Videos and projects you edit stay on your device and are not
          uploaded to our servers.
        </p>
      </Section>

      <Section title="2. Google account and YouTube data">
        <ul>
          <li>
            When you choose &ldquo;YouTube upload,&rdquo; the app requests this
            permission via Google Sign-In:
            <ul>
              <li>
                <code>https://www.googleapis.com/auth/youtube.upload</code> — upload
                the selected video to your own YouTube channel
              </li>
            </ul>
          </li>
          <li>
            This scope is used only to upload the video you selected to{" "}
            <strong>your own YouTube channel</strong>, with the title, description,
            tags, privacy status, and optional thumbnail you enter.
          </li>
          <li>
            Upload-related requests go directly from your device to Google (YouTube
            Data API). Google account information, access tokens, and channel data
            are not sent to or stored on our servers, are not shared or sold to
            third parties, and are not used for advertising.
          </li>
          <li>
            {SITE.appName}&apos;s use and transfer of information received from
            Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              style={link}
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </li>
          <li>
            The app uses YouTube API Services. When you use YouTube, the{" "}
            <a href="https://www.youtube.com/t/terms" style={link}>
              YouTube Terms of Service
            </a>{" "}
            and{" "}
            <a href="https://policies.google.com/privacy" style={link}>
              Google Privacy Policy
            </a>{" "}
            also apply.
          </li>
          <li>
            Revoke access any time via YouTube sign-out in the app, or at{" "}
            <a href="https://myaccount.google.com/permissions" style={link}>
              Google Account → Third-party access
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="3. Anonymous usage analytics">
        <p>
          To improve the product, the app may send anonymous data to our server: a
          random install ID, platform (iOS/Android), app version, event names (for
          example app open, editor opened, export completed, Pro paywall shown and
          outcome), and IDs of effects used. We do not collect name, email,
          contacts, video or text content, or Google account data. This data is used
          for aggregate statistics only and is deleted after at most two years.
        </p>
      </Section>

      <Section title="4. Advertising">
        <p>
          If a free user chooses to watch an ad to use a Pro effect once, a Google
          AdMob ad may be shown. AdMob may use device information such as an
          advertising identifier for delivery and measurement, under{" "}
          <a href="https://policies.google.com/technologies/ads" style={link}>
            Google advertising policies
          </a>
          . You can turn off ad personalization in your device settings.
        </p>
      </Section>

      <Section title="5. Payments (Pro subscription)">
        <p>
          Subscriptions are processed by the App Store or Google Play; the app does
          not receive card or other payment details. Our server verifies store
          receipts/tokens against your signed-in account to check subscription
          status. Cancel a subscription in your store account settings.
        </p>
      </Section>

      <Section title="6. Effect / music catalog and music search">
        <p>
          The app downloads transition effects, text templates, and music catalogs
          from our server. When you search for music, your search query is sent to
          our server and to music providers (Jamendo, Pixabay). No personal data is
          sent in that process beyond the query itself.
        </p>
      </Section>

      <Section title="7. Retention and deletion">
        <p>
          Videos and projects remain on your device and are removed when you delete
          them in the app or uninstall the app. To request deletion of anonymous
          usage statistics, contact us below.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          The app is not directed at children under 14, and we do not knowingly
          collect personal information from children.
        </p>
      </Section>

      <Section title="9. Changes and contact">
        <p>
          If this policy changes, we will post the update on this page and revise
          the effective date. Contact: {contact}
        </p>
      </Section>
    </SiteShell>
  );
}

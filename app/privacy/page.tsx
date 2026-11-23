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

      <Section title="3. Data protection mechanisms for Google user data">
        <p>
          Security procedures are in place to protect the confidentiality of your
          Google user data. We use encryption and platform security controls to
          protect this information, as follows:
        </p>
        <ul>
          <li>
            <strong>Encryption in transit.</strong> All communication with Google
            APIs (including YouTube upload and OAuth token exchange) uses HTTPS /
            TLS. Traffic between the app and our servers also uses HTTPS / TLS.
          </li>
          <li>
            <strong>On-device secure storage.</strong> Google Sign-In credentials and
            session markers are stored only on your device using the platform secure
            store (iOS Keychain / Android Keystore via encrypted secure storage). We
            do not store Google access tokens, refresh tokens, or account
            identifiers on our servers.
          </li>
          <li>
            <strong>Access control.</strong> Google user data is accessed only after
            you grant OAuth 2.0 consent, and only for the{" "}
            <code>youtube.upload</code> scope needed to upload to your own channel.
            Our backend has no credentials that can call Google APIs on your behalf.
          </li>
          <li>
            <strong>Data minimization.</strong> Videos and projects remain on your
            device. We request the narrowest Google scope required for upload and do
            not collect Google profile, email, channel metadata, or video content
            onto our servers.
          </li>
          <li>
            <strong>No human access or secondary use.</strong> Our staff and systems
            do not read, copy, or process Google user data obtained through Google
            APIs. We do not sell Google user data, use it for advertising, credit
            decisions, or AI / machine-learning model training.
          </li>
          <li>
            <strong>Deletion and revocation.</strong> Signing out of YouTube in the
            app clears the local session marker. You can revoke the app&apos;s Google
            access at any time in Google Account → Third-party access, which
            invalidates tokens for further API calls.
          </li>
        </ul>
      </Section>

      <Section title="4. Anonymous usage analytics">
        <p>
          To improve the product, the app may send anonymous data to our server: a
          random install ID, platform (iOS/Android), app version, event names (for
          example app open, editor opened, export completed, Pro paywall shown and
          outcome), and IDs of effects used. We do not collect name, email,
          contacts, video or text content, or Google account data. This data is used
          for aggregate statistics only and is deleted after at most two years.
        </p>
      </Section>

      <Section title="5. Advertising">
        <p>
          If a free user chooses to watch an ad to use a Pro effect once, a Google
          AdMob ad may be shown. AdMob may use device information such as an
          advertising identifier for delivery and measurement, under{" "}
          <a href="https://policies.google.com/technologies/ads" style={link}>
            Google advertising policies
          </a>
          . You can turn off ad personalization in your device settings. AdMob
          advertising does not receive Google user data obtained through the YouTube
          OAuth scopes.
        </p>
      </Section>

      <Section title="6. Payments (Pro subscription)">
        <p>
          Subscriptions are processed by the App Store or Google Play; the app does
          not receive card or other payment details. Our server verifies store
          receipts/tokens against your signed-in account to check subscription
          status. Cancel a subscription in your store account settings.
        </p>
      </Section>

      <Section title="7. Effect / music catalog and music search">
        <p>
          The app downloads transition effects, text templates, and music catalogs
          from our server. When you search for music, your search query is sent to
          our server and to music providers (Jamendo, Pixabay). No personal data is
          sent in that process beyond the query itself.
        </p>
      </Section>

      <Section title="8. Retention and deletion">
        <p>
          Videos and projects remain on your device and are removed when you delete
          them in the app or uninstall the app. Google OAuth tokens are not retained
          on our servers. To request deletion of anonymous usage statistics, contact
          us below. See also our{" "}
          <a href="/data-deletion" style={link}>
            Data deletion
          </a>{" "}
          page.
        </p>
      </Section>

      <Section title="9. Children">
        <p>
          The app is not directed at children under 14, and we do not knowingly
          collect personal information from children.
        </p>
      </Section>

      <Section title="10. Changes and contact">
        <p>
          If this policy changes, we will post the update on this page and revise
          the effective date. Contact: {contact}
        </p>
      </Section>
    </SiteShell>
  );
}

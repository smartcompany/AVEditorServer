import type { Metadata } from "next";
import { Section, SiteShell, s } from "../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Data Deletion — ${SITE.appName}`,
};

const link = { color: "#4cc9f0" };

export default function DataDeletionPage() {
  const contact = SITE.supportEmail || "(contact email)";
  return (
    <SiteShell>
      <h1 style={s.h1}>Data deletion</h1>
      <p style={s.muted}>
        Data deletion instructions · Facebook · Effective {SITE.policyDate}
      </p>

      <Section title="1. Facebook data we store">
        <p>
          {SITE.appName} does not store Facebook login accounts, friend lists, or
          post content on our servers. When you share a video via Facebook, you
          publish it yourself through the Facebook app/SDK on your device. Data on
          Facebook&apos;s side is managed by Facebook.
        </p>
      </Section>

      <Section title="2. How to delete data on your device">
        <ul>
          <li>
            Uninstalling the app removes editing projects, cache, and local tokens
            stored on the device.
          </li>
          <li>
            iOS: Settings → {SITE.appName} for permissions/data, or delete the app
            from the Home Screen.
          </li>
          <li>
            Android: Settings → Apps → {SITE.appName} → Storage to clear data, or
            uninstall the app.
          </li>
        </ul>
      </Section>

      <Section title="3. Delete your app account">
        <p>
          If you signed in to {SITE.appName}, open the app → Settings → Delete
          account. This removes your server profile, credit-account link, and
          push registration tied to that account. App Store / Google Play
          subscriptions are not canceled automatically — manage them in your
          store account settings.
        </p>
      </Section>

      <Section title="4. Disconnect the app on Facebook">
        <p>
          You can revoke the app under Facebook settings. Open{" "}
          <a href="https://www.facebook.com/settings?tab=applications" style={link}>
            Facebook → Settings → Apps and Websites
          </a>
          , find {SITE.appName}, and remove it. When Facebook requests data
          deletion, our callback issues a confirmation code.
        </p>
      </Section>

      <Section title="5. Deletion requests / contact">
        <p>
          For further deletion help, email{" "}
          <a
            href={`mailto:${contact}?subject=${encodeURIComponent(`${SITE.appName} data deletion`)}`}
            style={link}
          >
            {contact}
          </a>{" "}
          with your Facebook user ID if you have it. We respond within 30 business
          days. In most cases {SITE.appName} servers hold no Facebook account data
          to delete; we still confirm that we received your request.
        </p>
      </Section>
    </SiteShell>
  );
}

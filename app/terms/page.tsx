import type { Metadata } from "next";
import { Section, SiteShell, s } from "../site-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of Service — ${SITE.appName}`,
};

const link = { color: "#4cc9f0" };

export default function TermsPage() {
  const contact = SITE.supportEmail || "(contact email)";
  return (
    <SiteShell>
      <h1 style={s.h1}>Terms of Service</h1>
      <p style={s.muted}>Effective {SITE.policyDate}</p>

      <Section title="1. Service">
        <p>
          {SITE.appName} is a mobile app that provides video editing and YouTube
          upload features. By installing or using the app, you agree to these terms.
        </p>
      </Section>

      <Section title="2. User content">
        <p>
          You own and are responsible for the videos, music, and text you edit or
          upload. You must not create or upload content that infringes others&apos;
          copyrights, publicity rights, or other rights.
        </p>
      </Section>

      <Section title="3. YouTube upload">
        <p>
          When you upload to YouTube, the{" "}
          <a href="https://www.youtube.com/t/terms" style={link}>
            YouTube Terms of Service
          </a>{" "}
          and Community Guidelines apply. You are responsible for managing videos
          you upload.
        </p>
      </Section>

      <Section title="4. Pro subscription and ads">
        <p>
          Some effects require a Pro subscription or watching an ad. Subscriptions
          renew automatically at the end of each period unless cancelled in your App
          Store or Google Play account settings. Refunds follow each store&apos;s
          policy. Effects and benefits may change as we improve the service.
        </p>
      </Section>

      <Section title="5. Limitation of liability">
        <p>
          The app is provided &ldquo;as is.&rdquo; To the extent permitted by law, we
          are not liable for loss or data loss caused by insufficient device storage
          or outages of third-party services (YouTube, app stores, and similar).
          Please back up important videos separately.
        </p>
      </Section>

      <Section title="6. Changes and governing law">
        <p>
          If these terms change, we will post the update on this page. These terms
          are governed by the laws of the Republic of Korea. Contact: {contact}
        </p>
      </Section>
    </SiteShell>
  );
}

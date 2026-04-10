import type { Metadata } from "next";
import { LegalDocumentShell } from "@/src/components/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Terms & Conditions — Gellog",
  description: "Gellog terms and conditions of use.",
};

export default function TermsPage() {
  return (
    <LegalDocumentShell
      title="Terms & Conditions"
      otherDocHref="/privacy"
      otherDocLabel="Privacy Policy"
    >
      <p className="mb-8 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
        <strong>DISCLAIMER:</strong> These Terms &amp; Conditions were drafted
        with AI assistance. They are not a substitute for legal advice. By using
        Gellog you agree to these terms.
      </p>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          1. About Gellog
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog (&quot;the Service&quot;, &quot;the App&quot;) is a mobile and web
          application that allows users to log gelato visits, rate flavours,
          discover new gelato salons, and connect with other gelato enthusiasts.
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog is developed and operated by Sidus Studio, a sole proprietorship
          registered in the Netherlands. By accessing or using Gellog, you agree
          to be bound by these Terms &amp; Conditions.
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Contact:{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="mailto:support@gellog.app"
          >
            support@gellog.app
          </a>{" "}
          |{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://gellog.app"
            rel="noopener noreferrer"
            target="_blank"
          >
            https://gellog.app
          </a>
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          2. Eligibility
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          You must be at least 16 years old to use Gellog. By creating an
          account, you confirm that you meet this age requirement. If you are
          under 16, please do not use this service.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          3. User Accounts
        </h2>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          3.1 Registration
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          To use most features of Gellog, you must create an account. You agree
          to:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>Provide accurate and complete information when registering</li>
          <li>Keep your login credentials secure and confidential</li>
          <li>
            Notify us immediately at{" "}
            <a
              className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
              href="mailto:support@gellog.app"
            >
              support@gellog.app
            </a>{" "}
            if you suspect unauthorised access to your account
          </li>
          <li>Be responsible for all activity that occurs under your account</li>
        </ul>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          3.2 Username
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Your chosen username must not impersonate another person, contain
          offensive language, or infringe on trademarks. We reserve the right to
          reclaim or change usernames that violate these guidelines.
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          3.3 Account Termination
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          You may delete your account at any time from the Settings page within
          the app. We reserve the right to suspend or terminate accounts that
          violate these Terms, with or without prior notice.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          4. Acceptable Use
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          You agree to use Gellog only for its intended purpose. You must not:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>Post false, misleading, or defamatory reviews or log entries</li>
          <li>Harass, bully, or intimidate other users</li>
          <li>
            Post content that is illegal, offensive, hateful, or sexually
            explicit
          </li>
          <li>
            Attempt to gain unauthorised access to any part of Gellog or its
            infrastructure
          </li>
          <li>
            Scrape, copy, or redistribute content from Gellog without
            permission
          </li>
          <li>Use automated tools or bots to interact with the Service</li>
          <li>Impersonate Sidus Studio, Gellog staff, or other users</li>
          <li>
            Use the Service for any commercial purpose without our written
            consent
          </li>
        </ul>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          5. User-Generated Content
        </h2>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          5.1 Your Content
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog allows you to post logs, photos, ratings, comments, and other
          content (&quot;User Content&quot;). You retain ownership of your User
          Content.
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          By posting User Content, you grant Sidus Studio a non-exclusive,
          royalty-free, worldwide licence to use, display, and distribute that
          content within the Gellog platform for the purpose of operating and
          improving the Service.
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          5.2 Content Standards
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Your User Content must be accurate to the best of your knowledge. You
          must not post photos or content that you do not have the right to
          share. Reviews and ratings should reflect genuine personal experiences.
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          5.3 Content Removal
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We reserve the right to remove any User Content that violates these
          Terms or that we deem inappropriate, without prior notice.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          6. Subscription Tiers &amp; Payments
        </h2>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          6.1 Free Tier
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog is free to use. The free tier includes core logging features,
          social features, the discovery map, and salon pages with no artificial
          restrictions.
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          6.2 Premium User Tier (Ice Cream+)
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          A paid subscription tier (&quot;Ice Cream+&quot;) is available at
          €2.99 per month. Ice Cream+ unlocks additional features including
          advanced statistics, passport stamps, and other premium functionality
          as described in the app.
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          6.3 Salon Tiers
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Salon owners who claim their Gellog page may upgrade to paid salon
          tiers:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>
            Salon Basic — €9.00 per month: includes claimed profile, flavour
            board, and basic analytics
          </li>
          <li>
            Salon Pro — €29.00 per month: includes all Basic features plus full
            analytics, loyalty stamps, and featured placement
          </li>
        </ul>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          6.4 Billing &amp; Cancellation
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          All subscriptions are billed monthly. You may cancel at any time from
          the Settings page. Cancellation takes effect at the end of the current
          billing period — you retain access to paid features until then. We do
          not offer refunds for partial billing periods unless required by
          applicable law.
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          6.5 Price Changes
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We reserve the right to change subscription prices. We will notify
          existing subscribers at least 30 days before any price change takes
          effect. Continued use of the Service after a price change constitutes
          acceptance of the new price.
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          6.6 Payment Processing
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Payments are processed by Stripe, Inc. By subscribing, you agree to
          Stripe&apos;s Terms of Service (
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://stripe.com/legal"
            rel="noopener noreferrer"
            target="_blank"
          >
            stripe.com/legal
          </a>
          ). Gellog does not store your payment card details.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          7. Salon Pages &amp; Claiming
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog automatically generates public pages for gelato salons based on
          user-logged visits. These pages display community-sourced information
          including ratings, popular flavours, and recent logs.
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Salon owners may claim their page by completing the claim form within
          the app. Claiming is free. Gellog reserves the right to verify claims
          and revoke ownership if a claim is found to be fraudulent or
          inaccurate.
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog does not guarantee the accuracy of automatically generated
          salon information. If you are a salon owner and find inaccurate
          information on your page, please contact us at{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="mailto:support@gellog.app"
          >
            support@gellog.app
          </a>
          .
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          8. Intellectual Property
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          All content, design, code, and branding of Gellog (excluding User
          Content) is owned by Sidus Studio or its licensors and is protected by
          intellectual property law. You may not copy, modify, or distribute any
          part of Gellog without written permission.
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          The Gellog name, logo, and brand identity are trademarks of Sidus
          Studio.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          9. Third-Party Services
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog integrates with third-party services including Google Maps,
          Stripe, and Supabase. Your use of these services within Gellog is also
          subject to their respective terms of service. We are not responsible
          for the actions or content of third-party services.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          10. Disclaimers
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog is provided &quot;as is&quot; and &quot;as available&quot;
          without warranties of any kind, express or implied. We do not
          guarantee that:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>The Service will be available at all times or free of errors</li>
          <li>
            Information about salons, flavours, or ratings is accurate or up to
            date
          </li>
          <li>The Service will meet your specific requirements</li>
        </ul>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog is a community-driven platform. We are not responsible for the
          accuracy of user-generated content, including salon reviews and flavour
          ratings.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          11. Limitation of Liability
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          To the maximum extent permitted by Dutch law, Sidus Studio shall not be
          liable for any indirect, incidental, special, consequential, or
          punitive damages arising from your use of Gellog, including but not
          limited to loss of data, loss of profits, or damage to reputation.
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Our total liability to you for any claim arising from your use of
          Gellog shall not exceed the amount you paid us in the 12 months
          preceding the claim.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          12. Governing Law &amp; Disputes
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          These Terms &amp; Conditions are governed by the laws of the
          Netherlands. Any disputes shall be subject to the exclusive
          jurisdiction of the courts of the Netherlands.
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Before initiating any formal dispute, we encourage you to contact us at{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="mailto:support@gellog.app"
          >
            support@gellog.app
          </a>{" "}
          to resolve the matter informally.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          13. Changes to These Terms
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We may update these Terms &amp; Conditions from time to time. When we
          make material changes, we will notify you via the app or by email at
          least 14 days before the changes take effect. Your continued use of
          Gellog after that date constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          14. Contact
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          For any questions about these Terms &amp; Conditions:
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Email:{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="mailto:support@gellog.app"
          >
            support@gellog.app
          </a>
          <br />
          Website:{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://gellog.app"
            rel="noopener noreferrer"
            target="_blank"
          >
            https://gellog.app
          </a>
          <br />
          Sidus Studio, Zoetermeer, Netherlands
        </p>
      </section>
    </LegalDocumentShell>
  );
}

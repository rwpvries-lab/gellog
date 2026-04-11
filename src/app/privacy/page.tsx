import type { Metadata } from "next";
import { LegalDocumentShell } from "@/src/components/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Privacy Policy — Gellog",
  description: "Gellog privacy policy and data practices.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentShell
      title="Privacy Policy"
      otherDocHref="/terms"
      otherDocLabel="Terms & Conditions"
    >
      <p className="mb-8 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
        <strong>DISCLAIMER:</strong> This Privacy Policy was drafted with AI
        assistance and reviewed by the operator of Gellog. It is not a substitute
        for legal advice. If you have questions about your rights under GDPR,
        you may contact us directly or consult a legal professional.
      </p>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          1. Who We Are
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog is a gelato logging and discovery application developed and
          operated by:
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Sidus Studio
          <br />
          Zoetermeer, Netherlands
          <br />
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
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Sidus Studio is registered with the Dutch Chamber of Commerce as a sole
          proprietorship. We are the data controller responsible for your personal
          data.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          2. What Data We Collect
        </h2>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          2.1 Account Data
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          When you create an account, we collect:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>Email address</li>
          <li>Username (chosen by you)</li>
          <li>Display name (optional)</li>
          <li>Profile photo (optional)</li>
          <li>
            Password (stored as a secure hash — we never see your plain-text
            password)
          </li>
        </ul>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          2.2 Gelato Log Data
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          When you log a gelato visit, we collect:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>Salon name and location (via Google Places API)</li>
          <li>Flavours tried and ratings given</li>
          <li>Overall visit rating</li>
          <li>Photos you upload</li>
          <li>Notes you write</li>
          <li>Date and time of the visit</li>
          <li>Cup or cone selection</li>
          <li>Price paid (optional)</li>
        </ul>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          2.3 Weather Data
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          When you log a visit, we automatically capture weather conditions at
          your location using the Open-Meteo API. This includes temperature,
          apparent temperature, and weather condition. Open-Meteo does not
          receive any personally identifiable information — only your approximate
          coordinates at the time of logging.
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          2.4 Location Data
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We request your device location only when you actively log a gelato
          visit, in order to capture weather data and pre-fill the salon
          location. We do not continuously track your location. Location data is
          not stored as a separate record — it is used only at the moment of
          logging.
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          2.5 Social Data
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          If you use Gellog&apos;s social features, we store:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>Follow/following relationships between users</li>
          <li>Likes and comments you make on logs</li>
          <li>Your visibility settings (public / friends / private)</li>
        </ul>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          2.6 Payment Data
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          If you subscribe to a paid tier, payment is handled by Stripe. Gellog
          never sees, stores, or processes your card details. Stripe stores your
          payment information securely. We receive only a customer ID and
          subscription status from Stripe. For more information, see
          Stripe&apos;s Privacy Policy at{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://stripe.com/privacy"
            rel="noopener noreferrer"
            target="_blank"
          >
            stripe.com/privacy
          </a>
          .
        </p>

        <h3 className="mt-5 text-[15px] font-bold text-[color:var(--color-text-primary)]">
          2.7 Technical Data
        </h3>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We automatically collect basic technical information when you use the
          app:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>Browser type and version</li>
          <li>Device type (mobile / desktop)</li>
          <li>Pages visited and time spent</li>
          <li>Error logs</li>
        </ul>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          This data is used solely to maintain and improve the service.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          3. How We Use Your Data
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We use your personal data for the following purposes:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>To create and manage your Gellog account</li>
          <li>To provide the gelato logging and discovery features</li>
          <li>To show your logs in your feed and on your profile</li>
          <li>To enable social features (following, liking, commenting)</li>
          <li>To process your subscription payments via Stripe</li>
          <li>
            To send you transactional emails (account verification, password
            reset)
          </li>
          <li>To improve the app based on usage patterns</li>
          <li>To respond to your support requests</li>
        </ul>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We do not use your data for advertising. We do not sell your data to
          third parties.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          4. Legal Basis for Processing (GDPR)
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Under the General Data Protection Regulation (GDPR), we process your
          data under the following legal bases:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>
            Contract performance: processing necessary to provide the Gellog
            service you signed up for
          </li>
          <li>
            Legitimate interests: improving the service, preventing fraud,
            ensuring security
          </li>
          <li>
            Consent: where you have explicitly given consent (e.g. location
            access)
          </li>
          <li>Legal obligation: where required by Dutch or EU law</li>
        </ul>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          5. Third-Party Services
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog uses the following third-party services that may process your
          data:
        </p>

        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <strong>Supabase (database and file storage)</strong>
          <br />
          Your account data, logs, photos, and app data are stored on Supabase
          servers. Supabase stores data in EU-based infrastructure. Privacy
          policy:{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://supabase.com/privacy"
            rel="noopener noreferrer"
            target="_blank"
          >
            supabase.com/privacy
          </a>
        </p>

        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <strong>Vercel (hosting)</strong>
          <br />
          The Gellog web application is hosted on Vercel. Vercel may process
          request data (IP addresses, headers) as part of serving the
          application. Privacy policy:{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://vercel.com/legal/privacy-policy"
            rel="noopener noreferrer"
            target="_blank"
          >
            vercel.com/legal/privacy-policy
          </a>
        </p>

        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <strong>Google Maps &amp; Places API (location search)</strong>
          <br />
          We use Google&apos;s Places API to help you find and identify gelato
          salons. Search queries are sent to Google&apos;s servers. Privacy
          policy:{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://policies.google.com/privacy"
            rel="noopener noreferrer"
            target="_blank"
          >
            policies.google.com/privacy
          </a>
        </p>

        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <strong>Stripe (payments)</strong>
          <br />
          Subscription payments are processed by Stripe, Inc. Your payment
          details are handled entirely by Stripe and never stored by Gellog.
          Privacy policy:{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://stripe.com/privacy"
            rel="noopener noreferrer"
            target="_blank"
          >
            stripe.com/privacy
          </a>
        </p>

        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <strong>Open-Meteo (weather data)</strong>
          <br />
          We use the Open-Meteo API to fetch weather conditions at the time you
          log a visit. Only your approximate coordinates are sent — no personal
          data. Open-Meteo does not store requests. Privacy policy:{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://open-meteo.com/en/terms"
            rel="noopener noreferrer"
            target="_blank"
          >
            open-meteo.com/en/terms
          </a>
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          6. Data Retention
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We retain your data for as long as your account is active. You can
          delete your account at any time from the Settings page. When you delete
          your account:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>
            Your profile, logs, flavour ratings, and photos are permanently
            deleted
          </li>
          <li>Your comments and likes are removed</li>
          <li>
            Aggregated, anonymised data (e.g. total visits to a salon) may be
            retained
          </li>
        </ul>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Payment records may be retained for up to 7 years as required by Dutch
          tax law (Belastingdienst).
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          7. Your Rights Under GDPR
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          As a resident of the EU/EEA, you have the following rights:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>Right of access: request a copy of the data we hold about you</li>
          <li>Right to rectification: ask us to correct inaccurate data</li>
          <li>
            Right to erasure: request deletion of your data (&apos;right to be
            forgotten&apos;)
          </li>
          <li>
            Right to restriction: ask us to limit how we process your data
          </li>
          <li>
            Right to data portability: receive your data in a structured,
            machine-readable format
          </li>
          <li>
            Right to object: object to processing based on legitimate interests
          </li>
        </ul>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          To exercise any of these rights, email us at{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="mailto:support@gellog.app"
          >
            support@gellog.app
          </a>
          . We will respond within 30 days.
        </p>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          You also have the right to lodge a complaint with the Dutch Data
          Protection Authority (
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="https://autoriteitpersoonsgegevens.nl"
            rel="noopener noreferrer"
            target="_blank"
          >
            autoriteitpersoonsgegevens.nl
          </a>
          ).
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          8. Data Security
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We take reasonable measures to protect your personal data, including:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          <li>
            All data transmitted to/from Gellog is encrypted using HTTPS/TLS
          </li>
          <li>
            Passwords are hashed using industry-standard algorithms (handled by
            Supabase Auth)
          </li>
          <li>
            Database access is restricted using Row Level Security (RLS)
            policies
          </li>
          <li>We do not store payment card data</li>
        </ul>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          No method of transmission over the internet is 100% secure. We cannot
          guarantee absolute security.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          9. Children&apos;s Privacy
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          Gellog is not intended for children under the age of 16. We do not
          knowingly collect personal data from children under 16. If you believe
          a child has provided us with personal data, please contact us at{" "}
          <a
            className="font-medium text-[color:var(--color-teal)] underline hover:opacity-90"
            href="mailto:support@gellog.app"
          >
            support@gellog.app
          </a>{" "}
          and we will delete it promptly.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          10. Changes to This Policy
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          We may update this Privacy Policy from time to time. When we make
          significant changes, we will notify you via the app or by email. The
          &apos;Last updated&apos; date at the top of this document reflects the
          most recent revision. Continued use of Gellog after changes take effect
          constitutes acceptance of the revised policy.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="mt-10 border-b border-[color:var(--color-teal)] pb-1 text-[18px] font-bold text-[color:var(--color-teal)]">
          11. Contact
        </h2>
        <p className="text-sm leading-[1.7] text-[color:var(--color-text-primary)]">
          For any privacy-related questions or requests:
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

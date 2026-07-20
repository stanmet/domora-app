// Политика конфиденциальности (GDPR / Ирландия). Каноничный текст на английском;
// локализованная пометка сверху. ШАБЛОН - требует проверки юристом перед запуском.
import Link from "next/link";
import { getLocale } from "@/i18n/server";
import { getExtra } from "@/i18n/extra";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy Policy · Domora",
  description: "How Domora collects, uses and protects your personal data (GDPR).",
};

export default async function PrivacyPage() {
  const tx = getExtra(await getLocale());
  const updated = "19 July 2026";

  return (
    <main className="wrap sec" style={{ maxWidth: 760 }}>
      <h1 className="page">Privacy Policy</h1>
      <p className="sub">{tx.legalEnNote}</p>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>Last updated: {updated}</p>

      <div className="legal" style={{ lineHeight: 1.65, fontSize: 15 }}>
        <h3>1. Who we are</h3>
        <p>
          Domora (&quot;we&quot;, &quot;us&quot;) operates a free online noticeboard that connects clients and
          independent service providers in Ireland. We are the data controller for the personal data described here.
          Contact: <a href="mailto:help@domora.ie">help@domora.ie</a>.
        </p>

        <h3>2. What data we collect</h3>
        <ul>
          <li><b>Account data</b> — email, name, and optionally phone number, city and profile photo.</li>
          <li><b>Content you create</b> — tasks, offers, chat messages, reviews and any photos you upload.</li>
          <li><b>Provider profile</b> (if you are a provider) — description, services, prices, work area, portfolio.</li>
          <li><b>Technical data</b> — IP address, device/browser type and privacy-friendly usage statistics.</li>
        </ul>
        <p>Task and order addresses are stored encrypted. We do not collect payment card data (Domora handles no payments).</p>

        <h3>3. How and why we use your data (legal basis)</h3>
        <ul>
          <li>To provide the service — matching tasks and providers, chat, and revealing contact details once you choose each other (<b>performance of a contract</b>).</li>
          <li>For safety, moderation and abuse prevention, and to improve the product (<b>legitimate interests</b>).</li>
          <li>For analytics and non-essential cookies (<b>your consent</b>) — see our <Link href="/cookies">Cookie Policy</Link>.</li>
          <li>To meet legal obligations (<b>legal obligation</b>).</li>
        </ul>

        <h3>4. Sharing your data</h3>
        <p>
          When you choose the other party for an order, your phone number and WhatsApp become visible to them (and theirs
          to you). We use trusted processors to run the service: <b>Supabase</b> (hosting, authentication, database and
          file storage, in the EU), <b>Resend</b> (email notifications), <b>DeepL</b> (optional text translation) and
          <b> Plausible</b> (privacy-friendly, cookieless analytics). We never sell your personal data.
        </p>

        <h3>5. Retention</h3>
        <p>
          We keep your data while your account is active. When you delete your account, we anonymise your personal
          details and close access; some records may remain in anonymised form where needed for legal or safety reasons.
        </p>

        <h3>6. Your rights (GDPR)</h3>
        <p>You have the right to access, correct, delete, restrict or object to processing, to data portability, and to withdraw consent at any time. You can:</p>
        <ul>
          <li>edit your details on your <Link href="/account">account page</Link>;</li>
          <li>download your data as a file from your account (data export);</li>
          <li>delete your account from your account page;</li>
          <li>contact us at <a href="mailto:help@domora.ie">help@domora.ie</a> for any request.</li>
        </ul>
        <p>
          You also have the right to lodge a complaint with the Irish Data Protection Commission
          (<a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">dataprotection.ie</a>).
        </p>

        <h3>7. Security</h3>
        <p>Data is transmitted over HTTPS, addresses are encrypted at rest, and access is restricted. No system is perfectly secure, so please also protect your own account.</p>

        <h3>8. Children</h3>
        <p>Domora is not intended for people under 18.</p>

        <h3>9. Changes</h3>
        <p>We may update this policy. The current version is always available here with its update date.</p>

        <div className="err" style={{ background: "#f7f4ea", color: "var(--muted)", marginTop: 20 }}>
          This document is a general template and does not constitute legal advice. Have it reviewed by a qualified
          lawyer before public launch.
        </div>
      </div>

      <div className="cta" style={{ marginTop: 20 }}>
        <Link href="/terms" className="btn btn-line btn-sm">Terms</Link>
        <Link href="/cookies" className="btn btn-line btn-sm">Cookies</Link>
      </div>
    </main>
  );
}

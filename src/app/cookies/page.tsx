// Политика cookie. Каноничный текст на английском; локализованная пометка сверху.
import Link from "next/link";
import { getLocale } from "@/i18n/server";
import { getExtra } from "@/i18n/extra";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cookie Policy · Domora",
  description: "Which cookies Domora uses and how to control them.",
};

export default async function CookiesPage() {
  const tx = getExtra(await getLocale());

  return (
    <main className="wrap sec" style={{ maxWidth: 760 }}>
      <h1 className="page">Cookie Policy</h1>
      <p className="sub">{tx.legalEnNote}</p>

      <div className="legal" style={{ lineHeight: 1.65, fontSize: 15 }}>
        <h3>What are cookies</h3>
        <p>Cookies are small files stored by your browser. We use only the minimum needed to run the site, plus optional privacy-friendly analytics.</p>

        <h3>Cookies we use</h3>
        <ul>
          <li><b>Essential</b> — sign-in session and security (Supabase auth), your chosen language and city, and your cookie choice. The site cannot work without these.</li>
          <li><b>Analytics (optional)</b> — Plausible, a privacy-friendly, cookieless analytics tool that counts visits without tracking you across sites or using advertising identifiers. It runs only if you accept.</li>
        </ul>
        <p>We do not use advertising or cross-site tracking cookies, and we do not sell your data.</p>

        <h3>Your choice</h3>
        <p>
          You can accept analytics or keep essential-only using the banner shown on your first visit. You can also block
          or delete cookies in your browser settings; essential features may then stop working. See our
          {" "}<Link href="/privacy">Privacy Policy</Link> for how we handle personal data.
        </p>
      </div>

      <div className="cta" style={{ marginTop: 20 }}>
        <Link href="/privacy" className="btn btn-line btn-sm">Privacy</Link>
        <Link href="/terms" className="btn btn-line btn-sm">Terms</Link>
      </div>
    </main>
  );
}

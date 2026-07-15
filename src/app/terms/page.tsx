// Условия и ответственность площадки: Domora - маркетплейс-посредник, не сторона
// сделки. Общий шаблон, не юридическая консультация (см. дисклеймер).
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const locale = await getLocale();
  const t = getDict(locale);
  const points = [t.termsB1, t.termsB2, t.termsB3, t.termsB4, t.termsB5];

  return (
    <main className="wrap sec" style={{ maxWidth: 720 }}>
      <h1 className="page">{t.termsTitle}</h1>
      <p className="sub">{t.termsSub}</p>

      <ul className="inclist" style={{ margin: "10px 0 20px", gap: 16 }}>
        {points.map((p, i) => (
          <li key={i} style={{ alignItems: "flex-start" }}>
            <span className="inc-ic" style={{ background: "var(--sage)", color: "var(--green)", marginTop: 2 }}>
              <Check size={14} strokeWidth={3} />
            </span>
            <span style={{ lineHeight: 1.5 }}>{p}</span>
          </li>
        ))}
      </ul>

      <div className="err" style={{ background: "#f7f4ea", color: "var(--muted)" }}>
        {t.termsDisclaimer}
      </div>

      <div className="cta" style={{ marginTop: 20 }}>
        <Link href="/safety" className="btn btn-ink">
          {t.navSafety} <ArrowRight size={16} />
        </Link>
        <Link href="/how-it-works" className="btn btn-ghost">
          {t.navHowItWorks}
        </Link>
      </div>
    </main>
  );
}

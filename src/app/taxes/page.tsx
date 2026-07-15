// Налоги для исполнителей (Ирландия): порог €5000/год, регистрация, учёт,
// инвойсы. Общая информация, не налоговая консультация (см. дисклеймер).
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function TaxesPage() {
  const locale = await getLocale();
  const t = getDict(locale);
  const points = [t.taxB1, t.taxB2, t.taxB3, t.taxB4];

  return (
    <main className="wrap sec" style={{ maxWidth: 720 }}>
      <h1 className="page">{t.taxesTitle}</h1>
      <p className="sub">{t.taxesSub}</p>

      <ul className="inclist" style={{ margin: "10px 0 20px", gap: 16 }}>
        {points.map((p, i) => (
          <li key={i} style={{ alignItems: "flex-start" }}>
            <span className="inc-ic" style={{ marginTop: 2 }}>
              <Check size={14} strokeWidth={3} />
            </span>
            <span style={{ lineHeight: 1.5 }}>{p}</span>
          </li>
        ))}
      </ul>

      <div className="err" style={{ background: "#f7f4ea", color: "var(--muted)" }}>
        {t.taxDisclaimer}{" "}
        <a href="https://www.revenue.ie" target="_blank" rel="noopener noreferrer" style={{ color: "var(--green-dark)", fontWeight: 700 }}>
          revenue.ie
        </a>
      </div>

      <div className="cta" style={{ marginTop: 20 }}>
        <Link href="/pro/documents" className="btn btn-ink">
          {t.docsTitle} <ArrowRight size={16} />
        </Link>
        <Link href="/signup?role=pro" className="btn btn-ghost">
          {t.becomePro}
        </Link>
      </div>
    </main>
  );
}

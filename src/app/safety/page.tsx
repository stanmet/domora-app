// Безопасность и гарантии (в духе Kabanchik): проверка, оплата, чат, отзывы
// и программа защиты заказчика.
import Link from "next/link";
import { ArrowRight, CreditCard, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function SafetyPage() {
  const locale = await getLocale();
  const t = getDict(locale);

  const items: [typeof ShieldCheck, string, string][] = [
    [ShieldCheck, t.t1, t.t1p],
    [CreditCard, t.t2, t.t2p],
    [MessageCircle, t.t3, t.t3p],
    [Star, t.t4, t.t4p],
  ];

  return (
    <main className="wrap sec">
      <h1 className="page">{t.safeTitle}</h1>
      <p className="sub">{t.safeSub}</p>

      <div className="trust" style={{ paddingBottom: 24 }}>
        {items.map(([Icon, h, p], i) => (
          <div className="titem" key={i}>
            <div className="icircle">
              <Icon size={20} strokeWidth={1.7} />
            </div>
            <div>
              <h5>{h}</h5>
              <p>{p}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="travelcard" style={{ alignItems: "flex-start" }}>
        <span className="travel-ic" style={{ color: "var(--orange)" }}>
          <ShieldCheck size={18} />
        </span>
        <div>
          <b style={{ fontSize: 16 }}>{t.safeProtT}</b>
          <span style={{ marginTop: 6, lineHeight: 1.55 }}>{t.safeProtP}</span>
        </div>
      </div>

      <div className="cta" style={{ marginTop: 24 }}>
        <Link href="/catalog" className="btn btn-ink">
          {t.findPro} <ArrowRight size={16} />
        </Link>
        <Link href="/how-it-works" className="btn btn-ghost">
          {t.navHowItWorks}
        </Link>
      </div>
    </main>
  );
}

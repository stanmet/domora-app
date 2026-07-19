// Безопасность и гарантии (в духе Kabanchik): проверка, оплата, чат, отзывы
// и программа защиты заказчика.
import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck, Star, Users, Wallet } from "lucide-react";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";

export const dynamic = "force-dynamic";

export default async function SafetyPage() {
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);

  const items: [typeof ShieldCheck, string, string][] = [
    [Wallet, tx.tr1, tx.tr1p],
    [Users, tx.tr2, tx.tr2p],
    [MessageCircle, tx.tr3, tx.tr3p],
    [Star, tx.tr4, tx.tr4p],
  ];

  return (
    <main className="wrap sec">
      <h1 className="page">{tx.footerSafety}</h1>
      <p className="sub">{tx.safeLead}</p>

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
          <b style={{ fontSize: 16 }}>{tx.safeDiscT}</b>
          <span style={{ marginTop: 6, lineHeight: 1.55 }}>{tx.safeDiscP}</span>
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

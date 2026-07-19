// Как это работает: шаги для клиентов и для исполнителей (в духе Kabanchik).
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";

export const dynamic = "force-dynamic";

export default async function HowItWorksPage() {
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);

  const clientSteps: [string, string][] = [
    [tx.cs1, tx.cs1p],
    [tx.cs2, tx.cs2p],
    [tx.cs3, tx.cs3p],
    [tx.cs4, tx.cs4p],
  ];
  const proSteps: [string, string][] = [
    [tx.ps1, tx.ps1p],
    [tx.ps2, tx.ps2p],
    [tx.ps3, tx.ps3p],
  ];

  return (
    <main className="wrap sec">
      <h1 className="page">{t.hiwTitle}</h1>
      <p className="sub">{tx.hiwLead}</p>

      <h3 className="psec-h" style={{ marginTop: 18 }}>{t.hiwClients}</h3>
      <div className="steplist" style={{ marginBottom: 8 }}>
        {clientSteps.map(([h, p], i) => (
          <div className="step" key={i}>
            <div className="num">{i + 1}</div>
            <h4>{h}</h4>
            <p>{p}</p>
          </div>
        ))}
      </div>
      <div className="cta" style={{ margin: "16px 0 8px" }}>
        <Link href="/tasks/new" className="btn btn-green">
          {t.postTask} <ArrowRight size={16} />
        </Link>
        <Link href="/catalog" className="btn btn-ink">
          {t.findPro} <ArrowRight size={16} />
        </Link>
      </div>

      <h3 className="psec-h" style={{ marginTop: 32 }}>{t.hiwPros}</h3>
      <div className="steplist">
        {proSteps.map(([h, p], i) => (
          <div className="step" key={i}>
            <div className="num">{i + 1}</div>
            <h4>{h}</h4>
            <p>{p}</p>
          </div>
        ))}
      </div>
      <div className="cta" style={{ margin: "16px 0 8px" }}>
        <Link href="/signup?role=pro" className="btn btn-green">
          {t.becomePro} <ArrowRight size={16} />
        </Link>
      </div>

      <div className="tip" style={{ marginTop: 28 }}>
        <div className="ti" />
        <p>
          <b>{tx.freeTipB}</b> {tx.freeTipP}
        </p>
      </div>
    </main>
  );
}

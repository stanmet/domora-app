// Как это работает: шаги для клиентов и для исполнителей (в духе Kabanchik).
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function HowItWorksPage() {
  const locale = await getLocale();
  const t = getDict(locale);

  const clientSteps: [string, string][] = [
    [t.s1, t.s1p],
    [t.s2, t.s2p],
    [t.s3, t.s3p],
    [t.s4, t.s4p],
  ];
  const proSteps: [string, string][] = [
    [t.hpS1, t.hpS1p],
    [t.hpS2, t.hpS2p],
    [t.hpS3, t.hpS3p],
  ];

  return (
    <main className="wrap sec">
      <h1 className="page">{t.hiwTitle}</h1>
      <p className="sub">{t.hiwSub}</p>

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
          <b>{t.tipB}</b> {t.tipP}
        </p>
      </div>
    </main>
  );
}

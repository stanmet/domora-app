// Главная: герой, категории из базы, "как это работает", блок доверия.
// Разметка и стили из prototypes/Marketplace.jsx.
import Link from "next/link";
import { ArrowRight, CreditCard, Lightbulb, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { categoryDescription, categoryLabel, getDict } from "@/i18n/dictionaries";
import { CATEGORY_ICONS, sortByCategoryOrder } from "@/components/categories";

export const dynamic = "force-dynamic";

export default async function Home() {
  const locale = await getLocale();
  const t = getDict(locale);
  const categories = sortByCategoryOrder(await prisma.category.findMany());

  const steps: [string, string][] = [
    [t.s1, t.s1p],
    [t.s2, t.s2p],
    [t.s3, t.s3p],
    [t.s4, t.s4p],
  ];
  const trust: [typeof ShieldCheck, string, string][] = [
    [ShieldCheck, t.t1, t.t1p],
    [CreditCard, t.t2, t.t2p],
    [MessageCircle, t.t3, t.t3p],
    [Star, t.t4, t.t4p],
  ];

  return (
    <main>
      <div className="wrap hero">
        <div className="eyebrow">{t.tagline}</div>
        <h1 className="display">
          {t.h1a}
          <br />
          <em>{t.h1b}</em>
        </h1>
        <p>{t.heroP}</p>
        <div className="cta">
          <Link href="/catalog" className="btn btn-ink">
            {t.findPro} <ArrowRight size={16} />
          </Link>
          <Link href="/signup?role=pro" className="btn btn-ghost">
            {t.becomePro}
          </Link>
        </div>
      </div>

      <div className="wrap cats">
        {categories.map((c, i) => {
          const Icon = CATEGORY_ICONS[c.slug] ?? CATEGORY_ICONS.other;
          const fallbackName = locale === "ru" ? c.nameRu : c.nameEn;
          return (
            <Link href={`/catalog?cat=${c.slug}`} className="cat" key={c.id}>
              <div className="n">0{i + 1}</div>
              <div className="icircle">
                <Icon size={26} strokeWidth={1.6} />
              </div>
              <h3>{categoryLabel(t, c.slug, fallbackName)}</h3>
              <p>{categoryDescription(t, c.slug)}</p>
              <span className="go">
                {t.browse} <ArrowRight size={14} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="wrap steps">
        <div className="eyebrow">
          <b>01 · 04</b>
        </div>
        <h2>{t.howTitle}</h2>
        <div className="steplist">
          {steps.map(([h, p], i) => (
            <div className="step" key={i}>
              <div className="num">{i + 1}</div>
              <h4>{h}</h4>
              <p>{p}</p>
            </div>
          ))}
        </div>

        <div className="tip">
          <div className="ti">
            <Lightbulb size={20} />
          </div>
          <p>
            <b>{t.tipB}</b> {t.tipP}
          </p>
        </div>

        <div className="trust">
          {trust.map(([Icon, h, p], i) => (
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
      </div>
    </main>
  );
}

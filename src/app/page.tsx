// Главная: герой, горизонтальные вкладки категорий, лента открытых задач
// (видна всем, включая гостей), блок "Исполнители рядом" и блок доверия.
// Разметка и стили из prototypes/Marketplace.jsx + дизайн-система globals.css.
import Link from "next/link";
import { ArrowRight, Calendar, CreditCard, Lightbulb, MapPin, MessageCircle, ShieldCheck, Star, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { langName } from "@/i18n/config";
import { CATEGORY_ICONS, PHOTO_BG, sortByCategoryOrder } from "@/components/categories";
import { budgetText, dateOnly, eur } from "@/lib/format";
import { translateBatch } from "@/lib/translate";
import TranslatableText, { type TrLabels } from "@/components/TranslatableText";

export const dynamic = "force-dynamic";

export default async function Home() {
  const locale = await getLocale();
  const t = getDict(locale);
  const trLabels: TrLabels = { from: t.translatedFrom, showOriginal: t.showOriginal, showTranslation: t.showTranslation };

  const [categories, openTasks, listings] = await Promise.all([
    prisma.category.findMany(),
    prisma.task.findMany({
      where: { status: "OPEN", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        category: { select: { slug: true, nameEn: true, nameRu: true } },
        _count: { select: { offers: true } },
      },
    }),
    prisma.listing.findMany({
      where: { status: "ACTIVE", provider: { status: "ACTIVE" } },
      orderBy: [{ provider: { ratingCached: "desc" } }, { createdAt: "desc" }],
      take: 8,
      include: {
        provider: { select: { userId: true, displayName: true, city: true, ratingCached: true, jobsCount: true } },
        category: { select: { slug: true } },
      },
    }),
  ]);
  const cats = sortByCategoryOrder(categories);

  // Автоперевод пользовательских текстов (заголовки задач и услуг) на язык интерфейса.
  const tr = await translateBatch([...openTasks.map((x) => x.title), ...listings.map((l) => l.title)], locale);
  const trOf = (s: string) => tr.get(s.trim()) ?? { text: s, sourceLang: locale, translated: false };

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
          <Link href="/tasks/new" className="btn btn-green">
            {t.postTask} <ArrowRight size={16} />
          </Link>
          <Link href="/catalog" className="btn btn-ink">
            {t.findPro} <ArrowRight size={16} />
          </Link>
          <Link href="/signup?role=pro" className="btn btn-ghost">
            {t.becomePro}
          </Link>
        </div>
      </div>

      {/* Горизонтальные вкладки категорий (прокручиваются вбок) */}
      <div className="wrap" style={{ paddingTop: 18 }}>
        <div className="cattabs">
          {cats.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? CATEGORY_ICONS.other;
            const fallback = locale === "ru" ? c.nameRu : c.nameEn;
            return (
              <Link href={`/catalog?cat=${c.slug}`} className="cattab" key={c.id}>
                <span className="ic">
                  <Icon size={22} strokeWidth={1.7} />
                </span>
                <span>{categoryLabel(t, c.slug, fallback)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Открытые задачи: видны всем, ведут на страницу задачи */}
      <div className="wrap homesec">
        <div className="postcta">
          <div>
            <h3>{t.openTasksTitle}</h3>
            <p>{t.openTasksSub}</p>
          </div>
          <Link href="/tasks/new" className="btn btn-green">
            {t.postTask} <ArrowRight size={16} />
          </Link>
        </div>

        {openTasks.length === 0 ? (
          <div className="empty">{t.openTasksEmpty}</div>
        ) : (
          <div className="opentasks">
            {openTasks.map((task) => {
              const Icon = CATEGORY_ICONS[task.category.slug] ?? CATEGORY_ICONS.other;
              const budget = budgetText(task.budgetFromCents, task.budgetToCents, locale, { from: t.fromCap, to: t.budgetToL });
              const tt = trOf(task.title);
              return (
                <Link href={`/tasks/${task.id}`} className="taskcard" key={task.id}>
                  <div className="taskhead">
                    <span className="tasktag">
                      <Icon size={13} /> {categoryLabel(t, task.category.slug, locale === "ru" ? task.category.nameRu : task.category.nameEn)}
                    </span>
                    <span className="taskoffers">
                      <Users size={13} /> {task._count.offers}
                    </span>
                  </div>
                  <TranslatableText
                    as="h3"
                    display={tt.text}
                    original={task.title}
                    translated={tt.translated}
                    sourceLangName={langName(tt.sourceLang)}
                    labels={trLabels}
                  />
                  <div className="meta">
                    {task.dateWanted && (
                      <span>
                        <Calendar size={13} /> {dateOnly(task.dateWanted, locale)}
                      </span>
                    )}
                    <span>
                      <MapPin size={13} /> {task.city}
                    </span>
                    {budget && (
                      <span className="budget">
                        <Wallet size={13} /> {budget}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Исполнители рядом (каталог) */}
      <div className="wrap homesec">
        <div className="homesec-head">
          <h2>{t.catalogTitle}</h2>
          <Link href="/catalog" className="link">
            {t.browse} <ArrowRight size={14} />
          </Link>
        </div>
        {listings.length === 0 ? (
          <div className="empty">{t.noResults}</div>
        ) : (
          <div className="grid">
            {listings.map((l) => {
              const Icon = CATEGORY_ICONS[l.category.slug] ?? CATEGORY_ICONS.other;
              const rating = Number(l.provider.ratingCached);
              const isQuote = l.unit === "FIXED_QUOTE" || l.priceCents === 0;
              const cover = l.photos[0];
              const lt = trOf(l.title);
              return (
                <Link href={`/providers/${l.provider.userId}`} className="pcard2" key={l.id}>
                  <div className="photo" style={{ background: PHOTO_BG[l.category.slug] ?? PHOTO_BG.other }}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={l.title} />
                    ) : (
                      <>
                        <Icon size={56} strokeWidth={1.1} />
                        <div className="dots">
                          <i />
                          <i />
                          <i />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="t">{lt.text}</div>
                  <div className="m">
                    <span>{l.provider.displayName}</span>
                    <span>·</span>
                    <span>{l.provider.city}</span>
                    {l.provider.jobsCount > 0 && rating > 0 ? (
                      <span className="rate">
                        <Star size={12} fill="currentColor" /> {rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="tag">{t.newPro}</span>
                    )}
                  </div>
                  <div className="pr">
                    {isQuote ? (
                      t.byQuote
                    ) : (
                      <>
                        {t.fromCap} <b>{eur(l.priceCents, locale)}</b>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Как это работает + доверие (из утверждённого прототипа) */}
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

// Главная: герой, горизонтальные вкладки категорий, лента открытых задач
// (видна всем, включая гостей), блок "Исполнители рядом" и блок доверия.
// Разметка и стили из prototypes/Marketplace.jsx + дизайн-система globals.css.
import Link from "next/link";
import { ArrowRight, Calendar, Lightbulb, MapPin, MessageCircle, Star, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { langName } from "@/i18n/config";
import { CATEGORY_ICONS, PHOTO_BG, sortByCategoryOrder } from "@/components/categories";
import { budgetText, dateOnly, eur } from "@/lib/format";
import { openTaskVisibilityWhere } from "@/lib/tasks";
import { getCachedCategories } from "@/lib/categories-cache";
import { getHomeListings } from "@/lib/home-cache";
import { isDemoMode } from "@/lib/test-users/bots";
import { getCity } from "@/lib/city";
import { reachable, sameCity } from "@/lib/ireland";
import { translateBatch } from "@/lib/translate";
import TranslatableText, { type TrLabels } from "@/components/TranslatableText";

export const dynamic = "force-dynamic";

export default async function Home() {
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const trLabels: TrLabels = { from: t.translatedFrom, showOriginal: t.showOriginal, showTranslation: t.showTranslation };

  const city = await getCity();
  // Демо-режим: когда включён, показываем тестовые (ботовские) данные на публичном
  // сайте. По умолчанию выключен — реальные клиенты не видят синтетические аккаунты.
  const demo = await isDemoMode();
  // Данные главной грузим одним пакетом. Если база временно недоступна или схема
  // ещё досоздаётся (первые секунды после деплоя), не роняем страницу белым
  // экраном, а показываем главную с пустыми блоками - на следующем заходе всё
  // подтянется. Возвращаем null и подставляем безопасные пустые значения.
  const homeData = await Promise.all([
    getCachedCategories(),
    prisma.task.findMany({
      where: { ...openTaskVisibilityWhere(demo), ...(city ? { city } : {}) },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        category: { select: { slug: true, nameEn: true, nameRu: true } },
        _count: { select: { offers: true } },
      },
    }),
    // Город не фильтруем в SQL: ниже отбираем исполнителей по радиусу выезда.
    // Выборка закэширована (см. home-cache.ts), город учитывается уже после.
    getHomeListings(demo),
  ]).catch((e) => {
    console.error("Home data load failed (schema not ready or DB unavailable)", e);
    return null;
  });
  const [categories, openTasks, listingsRaw] =
    homeData ?? ([[], [], []] as [never[], never[], never[]]);
  const cats = sortByCategoryOrder(categories);

  // Исполнители рядом: подбор по радиусу выезда из их города до выбранного.
  const reachableListings = city ? listingsRaw.filter((l) => reachable(l.provider.city, l.provider.travelRadiusKm, city)) : listingsRaw;
  // Местные (из выбранного города) - выше приезжих.
  if (city) reachableListings.sort((a, b) => Number(!sameCity(a.provider.city, city)) - Number(!sameCity(b.provider.city, city)));
  const listings = reachableListings.slice(0, 16);

  // Автоперевод пользовательских текстов (заголовки задач и услуг) на язык интерфейса.
  const tr = await translateBatch([...openTasks.map((x) => x.title), ...listings.map((l) => l.title)], locale);
  const trOf = (s: string) => tr.get(s.trim()) ?? { text: s, sourceLang: locale, translated: false };

  const steps: [string, string][] = [
    [tx.cs1, tx.cs1p],
    [tx.cs2, tx.cs2p],
    [tx.cs3, tx.cs3p],
    [tx.cs4, tx.cs4p],
  ];
  const trust: [typeof Wallet, string, string][] = [
    [Wallet, tx.tr1, tx.tr1p],
    [Users, tx.tr2, tx.tr2p],
    [MessageCircle, tx.tr3, tx.tr3p],
    [Star, tx.tr4, tx.tr4p],
  ];

  return (
    <main>
      {/* Плашка-герой: стильный баннер в фирменном зелёном */}
      <div className="wrap" style={{ paddingTop: 16 }}>
        <section className="hbanner">
          <svg className="hb-deco" viewBox="0 0 300 220" fill="none" aria-hidden="true">
            <g stroke="rgba(255,255,255,.26)" strokeWidth="2">
              <line x1="230" y1="31" x2="150" y2="44" />
              <line x1="245" y1="31" x2="284" y2="74" />
              <line x1="230" y1="42" x2="205" y2="104" />
              <line x1="220" y1="121" x2="282" y2="150" />
              <line x1="190" y1="130" x2="165" y2="180" />
              <line x1="165" y1="190" x2="252" y2="202" />
            </g>
            <g stroke="rgba(255,255,255,.5)" strokeWidth="2.6" fill="rgba(255,255,255,.15)">
              <path d="M215 20 L230 8 L245 20 L245 42 L215 42 Z" />
              <path d="M190 116 L205 104 L220 116 L220 138 L190 138 Z" />
              <path d="M135 180 L150 168 L165 180 L165 202 L135 202 Z" />
            </g>
            <g fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.5)" strokeWidth="2.4">
              <circle cx="150" cy="44" r="8" />
              <circle cx="284" cy="74" r="13" />
              <circle cx="282" cy="150" r="10" />
              <circle cx="252" cy="202" r="9" />
            </g>
          </svg>
          <div className="hb-in">
            <span className="hb-pill">{tx.freeBadge}</span>
            <h1 className="hb-title">{tx.heroTitle}</h1>
            <p className="hb-sub">{tx.heroSub}</p>
            <div className="hb-cta">
              <Link href="/tasks/new" className="btn hb-btn">
                {t.postTask} <ArrowRight size={16} />
              </Link>
              <Link href="/catalog" className="btn hb-btn2">
                {t.findPro}
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Горизонтальные вкладки категорий (прокручиваются вбок) */}
      <div className="wrap" style={{ paddingTop: 20 }}>
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

      {/* Бесплатно для всех: без комиссий и процентов */}
      <div className="wrap" style={{ paddingTop: 14 }}>
        <div className="freebanner">
          <span className="fb-ic">
            <Wallet size={20} strokeWidth={1.8} />
          </span>
          <p>
            <b>{tx.freeBadge}.</b> {tx.freeBadgeP}
          </p>
        </div>
      </div>

      {/* Открытые задачи: видны всем, ведут на страницу задачи */}
      <div className="wrap homesec">
        <div className="postcta">
          <div>
            <h3>{t.openTasksTitle}</h3>
            <p>{t.openTasksSub}</p>
          </div>
          <Link href="/tasks/browse" className="link">
            {t.browse} <ArrowRight size={14} />
          </Link>
        </div>

        {openTasks.length === 0 ? (
          <div className="empty">{t.openTasksEmpty}</div>
        ) : (
          <div className="scrollpanel">
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
          <div className="scrollpanel">
            <div className="grid">
            {listings.map((l) => {
              const Icon = CATEGORY_ICONS[l.category.slug] ?? CATEGORY_ICONS.other;
              const rating = Number(l.provider.ratingCached);
              const isQuote = l.unit === "FIXED_QUOTE" || l.priceCents === 0;
              const travels = Boolean(city) && !sameCity(l.provider.city, city);
              const cover = l.photos[0];
              const lt = trOf(l.title);
              return (
                <Link href={`/providers/${l.provider.userId}`} className="pcard2" key={l.id}>
                  <div className="photo" style={{ background: PHOTO_BG[l.category.slug] ?? PHOTO_BG.other }}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={l.title} loading="lazy" decoding="async" />
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
                    {travels && <span className="tag travels">{t.travelsTo.replace("{city}", city!)}</span>}
                    {rating > 0 ? (
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
            <b>{tx.freeTipB}</b> {tx.freeTipP}
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

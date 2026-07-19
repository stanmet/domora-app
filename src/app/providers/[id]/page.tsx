// Профиль исполнителя в стиле богатой карточки услуги (референс caterkin.com),
// адаптированный под Domora: обложка-фото, блок "о себе" с тегами категорий,
// карточки услуг с фото и ценой, "что входит", "выезд к вам" с радиусом, отзывы
// и залипающая панель заказа снизу на телефоне. Дизайн-система из globals.css.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Images, MapPin, Navigation, ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict, unitLabel } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { flagReview } from "@/app/bookings/reviews-actions";
import { langName } from "@/i18n/config";
import { CATEGORY_ICONS, PHOTO_BG, sortByCategoryOrder } from "@/components/categories";
import { eur } from "@/lib/format";
import { translateBatch } from "@/lib/translate";
import TranslatableText, { type TrLabels } from "@/components/TranslatableText";
import FavoriteButton from "@/components/FavoriteButton";
import { toggleFavorite } from "@/app/favorites/actions";
import { isDemoMode } from "@/lib/test-users/bots";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = await prisma.providerProfile
    .findUnique({
      where: { userId: id },
      select: { displayName: true, customProfession: true, bio: true, city: true, status: true },
    })
    .catch(() => null);
  if (!provider || provider.status !== "ACTIVE") return { title: "Domora" };

  const who = [provider.customProfession, provider.city].filter(Boolean).join(" · ");
  const description = (provider.bio ?? "").slice(0, 180) || `${provider.displayName} on Domora. ${who}`;
  const title = who ? `${provider.displayName} · ${who}` : provider.displayName;
  return {
    title,
    description,
    alternates: { canonical: `/providers/${id}` },
    openGraph: { title: `${title} · Domora`, description, type: "profile" },
  };
}

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: id },
    include: {
      listings: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: {
          category: { select: { slug: true, nameEn: true, nameRu: true } },
          subcategory: { select: { slug: true } },
        },
      },
      user: {
        select: {
          isTest: true,
          avatarUrl: true,
          reviewsGot: {
            where: { publishedAt: { not: null } },
            orderBy: { publishedAt: "desc" },
            take: 20,
            select: { id: true, stars: true, text: true, disputeFlag: true, author: { select: { name: true } } },
          },
        },
      },
    },
  });

  // Тестовых исполнителей не показываем даже по прямой ссылке (кроме демо-режима).
  const demo = await isDemoMode();
  if (!provider || provider.status !== "ACTIVE" || (provider.user.isTest && !demo)) notFound();

  const rating = Number(provider.ratingCached);
  const reviews = provider.user.reviewsGot;
  const priced = provider.listings.filter((l) => l.priceCents > 0 && l.unit !== "FIXED_QUOTE" && !l.quoteFirst);
  const cheapest = priced.length ? priced.reduce((a, b) => (b.priceCents < a.priceCents ? b : a)) : null;


  // Обложка: первое фото портфолио, иначе фото любой услуги.
  const allPhotos = [...provider.portfolioPhotos, ...provider.listings.flatMap((l) => l.photos)];
  const cover = allPhotos[0] ?? null;
  const firstCat = provider.listings[0]?.category.slug ?? "other";

  // Уникальные категории исполнителя как теги.
  const catMap = new Map<string, string>();
  for (const l of provider.listings) {
    if (!catMap.has(l.category.slug)) {
      catMap.set(l.category.slug, categoryLabel(t, l.category.slug, locale === "ru" ? l.category.nameRu : l.category.nameEn));
    }
  }
  const catTags = sortByCategoryOrder([...catMap.keys()].map((slug) => ({ slug }))).map((c) => ({
    slug: c.slug,
    label: catMap.get(c.slug)!,
  }));

  // "Что входит": собираем из данных исполнителя.
  const included: string[] = [];
  // V1 без оплаты: показываем только относящееся к самой услуге (материалы).
  // Пункты про "безопасную оплату" и "чат до оплаты" убраны.
  if (provider.listings.some((l) => l.materialsIncluded)) included.push(t.incMaterials);

  // Автоперевод текстов профиля.
  const trLabels: TrLabels = { from: t.translatedFrom, showOriginal: t.showOriginal, showTranslation: t.showTranslation };
  const sources = [
    ...(provider.bio ? [provider.bio] : []),
    ...provider.listings.map((l) => l.title),
    ...provider.listings.flatMap((l) => (l.description ? [l.description] : [])),
  ];
  const tr = await translateBatch(sources, locale);
  const trOf = (s: string | null | undefined) =>
    s ? tr.get(s.trim()) ?? { text: s, sourceLang: locale, translated: false } : null;

  // Избранное для вошедшего пользователя; заодно определяем, смотрит ли профиль
  // сам исполнитель (тогда ему доступна жалоба на свой отзыв).
  const authUser = await getAuthUser();
  let isFav = false;
  let viewerIsTarget = false;
  if (authUser?.email) {
    const viewer = await ensureDbUser(authUser, locale);
    viewerIsTarget = viewer.id === provider.userId;
    const f = await prisma.favorite.findUnique({
      where: { userId_providerId: { userId: viewer.id, providerId: provider.userId } },
    });
    isFav = Boolean(f);
  }

  const profession = provider.customProfession?.trim();
  // V1 без прямой оплаты: заказ идёт через доску задач, а не бронирование листинга.
  const bookHref = "/tasks/new";

  // Schema.org для поисковиков: тип услуги, город, агрегированный рейтинг.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: provider.displayName,
    ...(profession ? { description: profession } : {}),
    areaServed: provider.city,
    ...(cheapest ? { priceRange: `from €${(cheapest.priceCents / 100).toFixed(0)}` } : {}),
    ...(provider.jobsCount > 0 && rating > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: reviews.length || provider.jobsCount } }
      : {}),
  };

  return (
    <main className="ppage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Обложка */}
      <div className="phero" style={cover ? undefined : { background: PHOTO_BG[firstCat] ?? PHOTO_BG.other }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={provider.displayName} className="phero-img" />
        ) : (
          (() => {
            const Icon = CATEGORY_ICONS[firstCat] ?? CATEGORY_ICONS.other;
            return <Icon size={64} strokeWidth={1.1} className="phero-icon" />;
          })()
        )}
        <Link href="/catalog" className="phero-back" aria-label={t.back}>
          <ArrowLeft size={18} />
        </Link>
        {allPhotos.length > 1 && (
          <span className="phero-count">
            <Images size={13} /> {allPhotos.length} · {t.viewAllPhotos}
          </span>
        )}
      </div>

      <div className="wrap">
        <div className="pintro">
          {provider.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={provider.user.avatarUrl} alt="" className="avatar big" style={{ objectFit: "cover", padding: 0 }} />
          ) : (
            <div className="avatar big">{provider.displayName[0]}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 className="ptitle">{provider.displayName}</h1>
            {profession && <div className="pprof">{profession}</div>}
            <div className="pmeta">
              {provider.jobsCount > 0 && rating > 0 ? (
                <span className="rate">
                  <Star size={14} fill="currentColor" /> {rating.toFixed(1)}
                </span>
              ) : (
                <span className="tag">{t.newPro}</span>
              )}
              {provider.jobsCount > 0 && (
                <span>
                  {provider.jobsCount} {t.jobs}
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <MapPin size={13} /> {provider.city}
              </span>
            </div>
          </div>
        </div>

        {catTags.length > 0 && (
          <div className="ptags">
            {catTags.map((c) => (
              <span className="ptag" key={c.slug}>
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="wrap pbody">
        <div className="pmain">
          {/* О себе */}
          {provider.bio &&
            (() => {
              const b = trOf(provider.bio)!;
              return (
                <section className="psec">
                  <h3 className="psec-h">{t.aboutTitle}</h3>
                  <TranslatableText
                    display={b.text}
                    original={provider.bio!}
                    translated={b.translated}
                    sourceLangName={langName(b.sourceLang)}
                    labels={trLabels}
                    style={{ fontSize: 15, lineHeight: 1.65, color: "var(--muted)" }}
                  />
                </section>
              );
            })()}

          {/* Портфолио */}
          {provider.portfolioPhotos.length > 0 && (
            <section className="psec">
              <h3 className="psec-h">{t.portfolioTitle}</h3>
              <div className="gallery lg">
                {provider.portfolioPhotos.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt={provider.displayName} />
                ))}
              </div>
            </section>
          )}

          {/* Услуги и цены */}
          <section className="psec">
            <h3 className="psec-h">{t.services}</h3>
            <div className="svc-list">
              {provider.listings.map((l) => {
                const lt = trOf(l.title)!;
                const ld = trOf(l.description);
                const Icon = CATEGORY_ICONS[l.category.slug] ?? CATEGORY_ICONS.other;
                const isQuote = l.unit === "FIXED_QUOTE" || l.priceCents === 0 || l.quoteFirst;
                const catLabel = categoryLabel(t, l.category.slug, locale === "ru" ? l.category.nameRu : l.category.nameEn);
                const inner = (
                  <>
                    <div className="svc-thumb" style={{ background: PHOTO_BG[l.category.slug] ?? PHOTO_BG.other }}>
                      {l.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.photos[0]} alt={l.title} />
                      ) : (
                        <Icon size={30} strokeWidth={1.2} />
                      )}
                    </div>
                    <div className="svc-body">
                      <span className="svc-badge">{catLabel}</span>
                      <TranslatableText
                        as="h4"
                        className="svc-title"
                        display={lt.text}
                        original={l.title}
                        translated={lt.translated}
                        sourceLangName={langName(lt.sourceLang)}
                        labels={trLabels}
                      />
                      {l.description && ld && (
                        <TranslatableText
                          className="svc-desc"
                          display={ld.text}
                          original={l.description}
                          translated={ld.translated}
                          sourceLangName={langName(ld.sourceLang)}
                          labels={trLabels}
                        />
                      )}
                      <div className="svc-price">
                        {isQuote ? (
                          <span>{t.byQuote}</span>
                        ) : (
                          <>
                            <b>{eur(l.priceCents, locale)}</b> <span>/ {unitLabel(t, l.unit)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                );
                return (
                  <div key={l.id} className="svc-card">
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Что входит */}
          {included.length > 0 && (
            <section className="psec">
              <h3 className="psec-h">{t.includedTitle}</h3>
              <ul className="inclist">
                {included.map((item, i) => (
                  <li key={i}>
                    <span className="inc-ic">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Выезд к вам */}
          <section className="psec">
            <h3 className="psec-h">{t.travelTitle}</h3>
            <div className="travelcard">
              <span className="travel-ic">
                <Navigation size={18} />
              </span>
              <div>
                <b>
                  {t.travelBasedIn} {provider.city}
                </b>
                <span>
                  {t.travelUpTo} {provider.travelRadiusKm} {t.kmUnit}
                </span>
              </div>
            </div>
          </section>

          {/* Отзывы */}
          <section className="psec">
            <h3 className="psec-h">{t.reviews}</h3>
            {reviews.length === 0 ? (
              <div className="empty" style={{ textAlign: "left", padding: "8px 0" }}>
                {t.noReviews}
              </div>
            ) : (
              reviews.map((r) => (
                <div className="review" key={r.id}>
                  <div className="rr">
                    {r.author.name}
                    <span className="stars">
                      {Array.from({ length: r.stars }).map((_, j) => (
                        <Star key={j} size={12} fill="currentColor" />
                      ))}
                    </span>
                  </div>
                  {r.text && <p>{r.text}</p>}
                  {viewerIsTarget &&
                    (r.disputeFlag ? (
                      <span className="tag" style={{ marginTop: 4 }}>{tx.reviewReported}</span>
                    ) : (
                      <form action={flagReview.bind(null, r.id)} style={{ marginTop: 4 }}>
                        <button className="btn btn-line btn-sm">{tx.reviewReport}</button>
                      </form>
                    ))}
                </div>
              ))
            )}
          </section>
        </div>

        {/* Боковая карточка цены (десктоп) */}
        <aside className="side pside">
          <div className="from">{t.sideFrom}</div>
          <div className="amt">
            {cheapest ? (
              <>
                {eur(cheapest.priceCents, locale)} <span>/ {unitLabel(t, cheapest.unit)}</span>
              </>
            ) : (
              <span style={{ fontSize: 18 }}>{t.byQuote}</span>
            )}
          </div>
          <Link href={bookHref} className="btn btn-green" style={{ width: "100%", justifyContent: "center" }}>
            {t.postTask}
          </Link>
          <FavoriteButton
            action={toggleFavorite.bind(null, provider.userId)}
            active={isFav}
            addLabel={t.favAdd}
            removeLabel={t.favRemove}
          />
          <div className="note">
            <ShieldCheck size={15} /> {tx.safeLead}
          </div>
        </aside>
      </div>

      {/* Залипающая панель заказа (телефон) */}
      <div className="bookbar">
        <div className="bookbar-price">
          {cheapest ? (
            <>
              <span className="bookbar-from">{t.sideFrom}</span>
              <span className="bookbar-amt">
                <b>{eur(cheapest.priceCents, locale)}</b> / {unitLabel(t, cheapest.unit)}
              </span>
            </>
          ) : (
            <span className="bookbar-amt">{t.byQuote}</span>
          )}
        </div>
        <Link href={bookHref} className="btn btn-green">
          {t.postTask}
        </Link>
      </div>
    </main>
  );
}

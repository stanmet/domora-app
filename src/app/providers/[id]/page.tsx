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
import { langName } from "@/i18n/config";
import { CATEGORY_ICONS, PHOTO_BG, sortByCategoryOrder } from "@/components/categories";
import { licenceFor } from "@/lib/subcategories";
import { eur } from "@/lib/format";
import { translateBatch } from "@/lib/translate";
import TranslatableText, { type TrLabels } from "@/components/TranslatableText";
import FavoriteButton from "@/components/FavoriteButton";
import { toggleFavorite } from "@/app/favorites/actions";

export const dynamic = "force-dynamic";

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getDict(locale);

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
          reviewsGot: {
            where: { publishedAt: { not: null } },
            orderBy: { publishedAt: "desc" },
            take: 20,
            select: { id: true, stars: true, text: true, author: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!provider || provider.status !== "ACTIVE") notFound();

  const rating = Number(provider.ratingCached);
  const reviews = provider.user.reviewsGot;
  const priced = provider.listings.filter((l) => l.priceCents > 0 && l.unit !== "FIXED_QUOTE" && !l.quoteFirst);
  const cheapest = priced.length ? priced.reduce((a, b) => (b.priceCents < a.priceCents ? b : a)) : null;

  // Регулируемые услуги (электрика RECI, газ RGII): бейдж наличия лицензии.
  const hasRegulated = provider.listings.some((l) => licenceFor(l.subcategory?.slug));
  let docCount = 0;
  let verifiedCount = 0;
  if (hasRegulated) {
    try {
      const rows = await prisma.providerDocument.findMany({
        where: { providerId: provider.userId },
        select: { verifiedAt: true },
      });
      docCount = rows.length;
      verifiedCount = rows.filter((r) => r.verifiedAt).length;
    } catch {
      // Таблица документов недоступна: считаем 0.
    }
  }
  const licenceState: "verified" | "onfile" | "required" =
    verifiedCount > 0 ? "verified" : docCount > 0 ? "onfile" : "required";
  const licenceOk = licenceState !== "required";
  const licenceLabel =
    licenceState === "verified" ? t.licenceVerified : licenceState === "onfile" ? t.licenceOnFile : t.licenceRequired;
  const licenceStyle =
    licenceState === "verified"
      ? undefined
      : licenceState === "onfile"
        ? { background: "#eef0ea", color: "var(--muted)" }
        : { background: "#FDEBE0", color: "var(--orange)" };

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
  if (provider.listings.some((l) => l.materialsIncluded)) included.push(t.incMaterials);
  included.push(t.incSecure);
  included.push(t.incChat);

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

  // Избранное для вошедшего пользователя.
  const authUser = await getAuthUser();
  let isFav = false;
  if (authUser?.email) {
    const viewer = await ensureDbUser(authUser, locale);
    const f = await prisma.favorite.findUnique({
      where: { userId_providerId: { userId: viewer.id, providerId: provider.userId } },
    });
    isFav = Boolean(f);
  }

  const profession = provider.customProfession?.trim();
  const bookHref = cheapest ? `/providers/${provider.userId}/book` : null;

  return (
    <main className="ppage">
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
          <div className="avatar big">{provider.displayName[0]}</div>
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
              {provider.identityVerifiedAt && (
                <span className="verified">
                  <ShieldCheck size={12} /> {t.verified}
                </span>
              )}
              {hasRegulated && (
                <span className="verified" style={licenceStyle}>
                  <ShieldCheck size={12} /> {licenceLabel}
                </span>
              )}
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
                const bookable = !isQuote;
                const lic = licenceFor(l.subcategory?.slug);
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
                      {lic && (
                        <span className="svc-badge" style={{ marginLeft: 6, ...licenceStyle }}>
                          {lic} · {licenceLabel}
                        </span>
                      )}
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
                return bookable ? (
                  <Link key={l.id} href={`/providers/${provider.userId}/book?listing=${l.id}`} className="svc-card">
                    {inner}
                  </Link>
                ) : (
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
          {bookHref ? (
            <Link href={bookHref} className="btn btn-green" style={{ width: "100%", justifyContent: "center" }}>
              {t.request}
            </Link>
          ) : (
            <button className="btn btn-green" style={{ width: "100%", justifyContent: "center" }} disabled>
              {t.request}
            </button>
          )}
          <FavoriteButton
            action={toggleFavorite.bind(null, provider.userId)}
            active={isFav}
            addLabel={t.favAdd}
            removeLabel={t.favRemove}
          />
          <div className="note">
            <ShieldCheck size={15} /> {t.sideNote}
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
        {bookHref ? (
          <Link href={bookHref} className="btn btn-green">
            {t.request}
          </Link>
        ) : (
          <button className="btn btn-green" disabled>
            {t.request}
          </button>
        )}
      </div>
    </main>
  );
}

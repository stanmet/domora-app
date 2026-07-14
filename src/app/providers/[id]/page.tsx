// Профиль исполнителя: биография, услуги с ценами, отзывы, боковая карточка цены.
// Разметка и стили из prototypes/Marketplace.jsx.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict, unitLabel } from "@/i18n/dictionaries";
import { langName } from "@/i18n/config";
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
      listings: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } },
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

  // Автоперевод пользовательских текстов профиля на язык интерфейса.
  const trLabels: TrLabels = { from: t.translatedFrom, showOriginal: t.showOriginal, showTranslation: t.showTranslation };
  const sources = [
    ...(provider.bio ? [provider.bio] : []),
    ...provider.listings.map((l) => l.title),
    ...provider.listings.flatMap((l) => (l.description ? [l.description] : [])),
  ];
  const tr = await translateBatch(sources, locale);
  const trOf = (s: string | null | undefined) =>
    s ? tr.get(s.trim()) ?? { text: s, sourceLang: locale, translated: false } : null;

  // Избранное: показываем состояние кнопки для вошедшего пользователя.
  const authUser = await getAuthUser();
  let isFav = false;
  if (authUser?.email) {
    const viewer = await ensureDbUser(authUser, locale);
    const f = await prisma.favorite.findUnique({
      where: { userId_providerId: { userId: viewer.id, providerId: provider.userId } },
    });
    isFav = Boolean(f);
  }

  return (
    <main className="wrap">
      <Link href="/catalog" className="back">
        <ArrowLeft size={14} /> {t.back}
      </Link>
      <div className="phead">
        <div className="avatar big">{provider.displayName[0]}</div>
        <div>
          <h1>{provider.displayName}</h1>
          <div className="pmeta" style={{ marginTop: 8, gap: 12 }}>
            {provider.jobsCount > 0 && rating > 0 ? (
              <span className="rate">
                <Star size={14} fill="currentColor" /> {rating.toFixed(1)}
              </span>
            ) : (
              <span className="tag">{t.newPro}</span>
            )}
            <span>
              {provider.jobsCount} {t.jobs}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <MapPin size={13} /> {provider.city}
            </span>
            {provider.identityVerifiedAt && (
              <span className="verified">
                <ShieldCheck size={12} /> {t.verified}
              </span>
            )}
          </div>
        </div>
      </div>
      {provider.portfolioPhotos.length > 0 && (
        <div className="gallery lg" style={{ marginTop: 20 }}>
          {provider.portfolioPhotos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt={provider.displayName} />
          ))}
        </div>
      )}
      <div className="cols">
        <div>
          {provider.bio &&
            (() => {
              const b = trOf(provider.bio)!;
              return (
                <TranslatableText
                  display={b.text}
                  original={provider.bio}
                  translated={b.translated}
                  sourceLangName={langName(b.sourceLang)}
                  labels={trLabels}
                  style={{ fontSize: 15, lineHeight: 1.6, color: "var(--muted)", paddingBottom: 8 }}
                />
              );
            })()}
          <h3
            style={{
              fontFamily: "Archivo",
              fontWeight: 800,
              textTransform: "uppercase",
              fontSize: 16,
              margin: "22px 0 4px",
            }}
          >
            {t.services}
          </h3>
          {provider.listings.map((l) => {
            const lt = trOf(l.title)!;
            const ld = trOf(l.description);
            return (
            <div className="svc" key={l.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "baseline" }}>
              <div>
                <TranslatableText
                  as="h4"
                  display={lt.text}
                  original={l.title}
                  translated={lt.translated}
                  sourceLangName={langName(lt.sourceLang)}
                  labels={trLabels}
                />
                {l.description && ld && (
                  <TranslatableText
                    display={ld.text}
                    original={l.description}
                    translated={ld.translated}
                    sourceLangName={langName(ld.sourceLang)}
                    labels={trLabels}
                  />
                )}
              </div>
              <div className="pr">
                {l.priceCents > 0 && l.unit !== "FIXED_QUOTE" ? (
                  <>
                    {eur(l.priceCents, locale)} <span>/ {unitLabel(t, l.unit)}</span>
                  </>
                ) : (
                  <span>{t.byQuote}</span>
                )}
              </div>
              </div>
              {l.photos.length > 0 && (
                <div className="gallery">
                  {l.photos.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt={l.title} />
                  ))}
                </div>
              )}
            </div>
            );
          })}
          <h3
            style={{
              fontFamily: "Archivo",
              fontWeight: 800,
              textTransform: "uppercase",
              fontSize: 16,
              margin: "28px 0 4px",
            }}
          >
            {t.reviews}
          </h3>
          {reviews.length === 0 ? (
            <div className="empty" style={{ textAlign: "left", padding: "16px 0" }}>
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
        </div>
        <div className="side">
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
          {cheapest ? (
            <Link
              href={`/providers/${provider.userId}/book`}
              className="btn btn-green"
              style={{ width: "100%", justifyContent: "center" }}
            >
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
        </div>
      </div>
    </main>
  );
}

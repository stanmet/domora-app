// Каталог: активные плашки услуг из базы, поиск по названию,
// фильтры по категории и городу. Разметка карточек из prototypes/Marketplace.jsx.
import Link from "next/link";
import { Star } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict, unitLabel } from "@/i18n/dictionaries";
import { CATEGORY_ICONS, PHOTO_BG, sortByCategoryOrder } from "@/components/categories";
import { eur } from "@/lib/format";
import CatalogFilters from "./CatalogFilters";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; cat?: string; city?: string };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q = "", cat = "", city = "" } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    provider: { status: "ACTIVE", ...(city ? { city } : {}) },
    ...(cat ? { category: { slug: cat } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { professionLabel: { contains: q, mode: "insensitive" } },
            { provider: { is: { displayName: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [categories, cityRows, listings] = await Promise.all([
    prisma.category.findMany(),
    prisma.providerProfile.findMany({
      where: { status: "ACTIVE" },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    }),
    prisma.listing.findMany({
      where,
      include: {
        provider: { select: { userId: true, displayName: true, city: true, ratingCached: true, jobsCount: true } },
        category: { select: { slug: true } },
      },
      orderBy: [{ provider: { ratingCached: "desc" } }, { createdAt: "desc" }],
    }),
  ]);

  const tabCategories = sortByCategoryOrder(categories).map((c) => ({
    slug: c.slug,
    label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn),
  }));

  return (
    <main className="wrap sec">
      <CatalogFilters
        q={q}
        cat={cat}
        city={city}
        cities={cityRows.map((r) => r.city)}
        categories={tabCategories}
        labels={{ searchPh: t.searchPh, filters: t.filters, cityAll: t.cityAll, all: t.all }}
      />

      <h2 className="display" style={{ fontSize: "clamp(22px,4.5vw,32px)", margin: "0 0 6px" }}>
        {t.catalogTitle}
      </h2>
      <div className="count">
        {listings.length} {t.results}
      </div>

      {listings.length === 0 ? (
        <div className="empty">{t.noResults}</div>
      ) : (
        <div className="grid">
          {listings.map((l) => {
            const Icon = CATEGORY_ICONS[l.category.slug] ?? CATEGORY_ICONS.other;
            const rating = Number(l.provider.ratingCached);
            const isQuote = l.unit === "FIXED_QUOTE" || l.priceCents === 0;
            return (
              <Link href={`/providers/${l.provider.userId}`} className="pcard2" key={l.id}>
                <div className="photo" style={{ background: PHOTO_BG[l.category.slug] ?? PHOTO_BG.other }}>
                  <Icon size={56} strokeWidth={1.1} />
                  <div className="dots">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <div className="t">{l.title}</div>
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
                      {t.fromCap} <b>{eur(l.priceCents, locale)}</b> / {unitLabel(t, l.unit)}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

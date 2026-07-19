// Каталог: активные плашки услуг из базы, поиск по названию,
// фильтры по категории и городу. Разметка карточек из prototypes/Marketplace.jsx.
import Link from "next/link";
import { Star } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict, unitLabel } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { CATEGORY_ICONS, PHOTO_BG, sortByCategoryOrder } from "@/components/categories";
import { eur } from "@/lib/format";
import { translateBatch } from "@/lib/translate";
import { IRELAND_TOWN_NAMES, reachable } from "@/lib/ireland";
import { isDemoMode } from "@/lib/test-users/bots";
import CatalogFilters from "./CatalogFilters";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { cat = "", city = "" } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);

  // Локализованное имя категории (если выбрана) для SEO-заголовка.
  let catName = "";
  if (cat) {
    try {
      const row = await prisma.category.findUnique({ where: { slug: cat }, select: { slug: true, nameEn: true, nameRu: true } });
      if (row) catName = categoryLabel(t, row.slug, locale === "ru" ? row.nameRu : row.nameEn);
    } catch {
      // База недоступна - оставляем общий заголовок.
    }
  }

  const parts = [catName, city].filter(Boolean);
  const title = parts.length ? `${parts.join(" · ")} · Domora` : `${t.catalogTitle} · Domora`;
  const description = parts.length ? `${parts.join(" · ")}. ${tx.homeHero}` : tx.homeHero;
  // Канонический адрес включает выбранные категорию и город.
  const qs = new URLSearchParams();
  if (cat) qs.set("cat", cat);
  if (city) qs.set("city", city);
  const canonical = qs.toString() ? `/catalog?${qs.toString()}` : "/catalog";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description },
  };
}

type SearchParams = { q?: string; cat?: string; city?: string; sub?: string; sort?: string; maxPrice?: string; minRating?: string; minJobs?: string };

// Варианты сортировки каталога.
const SORTS = ["recommended", "price_asc", "price_desc", "rating", "popular"] as const;
type Sort = (typeof SORTS)[number];

function orderByFor(sort: Sort): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ priceCents: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ priceCents: "desc" }, { createdAt: "desc" }];
    case "rating":
      return [{ provider: { ratingCached: "desc" } }, { createdAt: "desc" }];
    case "popular":
      return [{ provider: { jobsCount: "desc" } }, { createdAt: "desc" }];
    default:
      return [{ provider: { ratingCached: "desc" } }, { createdAt: "desc" }];
  }
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q = "", cat = "", city = "", sub = "", sort = "", maxPrice = "", minRating = "", minJobs = "" } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);

  const activeSort: Sort = (SORTS as readonly string[]).includes(sort) ? (sort as Sort) : "recommended";
  const maxPriceCents = maxPrice && Number(maxPrice) > 0 ? Math.round(Number(maxPrice) * 100) : null;
  const minRatingNum = minRating && Number(minRating) > 0 ? Number(minRating) : null;
  const minJobsNum = minJobs && Number(minJobs) > 0 ? Math.floor(Number(minJobs)) : null;

  // Название активной подкатегории (для чипа-фильтра). Таблица может отсутствовать.
  let subName: string | null = null;
  if (sub) {
    try {
      const row = await prisma.subcategory.findUnique({ where: { slug: sub }, select: { nameEn: true, nameRu: true } });
      if (row) subName = locale === "ru" || locale === "uk" ? row.nameRu : row.nameEn;
    } catch {
      // нет таблицы - фильтр по подкатегории просто не применяем
    }
  }

  // Демо-режим: показываем тестовых (ботовских) исполнителей в поиске.
  const demo = await isDemoMode();

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    provider: {
      status: "ACTIVE",
      user: demo ? {} : { isTest: false }, // без синтетических исполнителей в поиске (кроме демо-режима)
      // Город здесь НЕ фильтруем: подбор по радиусу выезда исполнителя делаем
      // ниже (reachable), чтобы исполнитель находился и в соседних областях.
      ...(minRatingNum ? { ratingCached: { gte: minRatingNum } } : {}),
      ...(minJobsNum ? { jobsCount: { gte: minJobsNum } } : {}),
    },
    ...(cat ? { category: { slug: cat } } : {}),
    ...(sub && subName ? { subcategory: { is: { slug: sub } } } : {}),
    // Фильтр по цене не применяем к услугам «по смете» (priceCents = 0).
    ...(maxPriceCents ? { priceCents: { gt: 0, lte: maxPriceCents } } : {}),
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

  const [categories, listingsRaw] = await Promise.all([
    prisma.category.findMany(),
    prisma.listing.findMany({
      where,
      include: {
        provider: {
          select: { userId: true, displayName: true, city: true, travelRadiusKm: true, ratingCached: true, jobsCount: true },
        },
        category: { select: { slug: true } },
      },
      orderBy: orderByFor(activeSort),
    }),
  ]);

  // Подбор по радиусу выезда: если выбран город, оставляем исполнителей, которые
  // достают до него из своего города (или работают по всей стране большим радиусом).
  const listings = city
    ? listingsRaw.filter((l) => reachable(l.provider.city, l.provider.travelRadiusKm, city))
    : listingsRaw;

  const tabCategories = sortByCategoryOrder(categories).map((c) => ({
    slug: c.slug,
    label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn),
  }));

  // Автоперевод названий услуг на язык интерфейса.
  const titleTr = await translateBatch(listings.map((l) => l.title), locale);

  return (
    <main className="wrap sec">
      <CatalogFilters
        q={q}
        cat={cat}
        city={city}
        cities={IRELAND_TOWN_NAMES}
        categories={tabCategories}
        sort={activeSort}
        maxPrice={maxPrice}
        minRating={minRating}
        minJobs={minJobs}
        labels={{
          searchPh: t.searchPh,
          filters: t.filters,
          cityL: t.taskCityL,
          cityAll: t.cityAll,
          all: t.all,
          sort: tx.catSort,
          sortRecommended: tx.catSortRecommended,
          sortPriceAsc: tx.catSortPriceAsc,
          sortPriceDesc: tx.catSortPriceDesc,
          sortRating: tx.catSortRating,
          sortPopular: tx.catSortPopular,
          maxPriceL: tx.catMaxPrice,
          minRatingL: tx.catMinRating,
          experienceL: tx.catExperience,
          apply: tx.catApply,
          reset: tx.catReset,
          any: tx.catAny,
        }}
      />

      <h2 className="display" style={{ fontSize: "clamp(22px,4.5vw,32px)", margin: "0 0 6px" }}>
        {t.catalogTitle}
      </h2>
      {subName && (
        <div className="chips" style={{ marginBottom: 10 }}>
          <Link href={cat ? `/catalog?cat=${cat}` : "/catalog"} className="chip on">
            {subName} ✕
          </Link>
        </div>
      )}
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
                  {l.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.photos[0]} alt={l.title} />
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
                <div className="t">{titleTr.get(l.title.trim())?.text ?? l.title}</div>
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

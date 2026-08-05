// Кэш блока «Исполнители рядом» на главной. Список активных услуг одинаков для
// всех (город учитывается уже в коде, после выборки), меняется только когда
// исполнитель добавляет/выключает услугу, грузит фото или правит профиль.
// Держим в кэше данных Next и сбрасываем по тегу LISTINGS_TAG при таких
// изменениях; плюс сам обновляется раз в 60 c (страховка, если тег где-то забыт).
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const LISTINGS_TAG = "listings";

// demo=false скрывает тестовых исполнителей (обычный режим); demo=true показывает
// их (демо-режим). Аргумент входит в ключ кэша, поэтому варианты не смешиваются.
export const getHomeListings = unstable_cache(
  async (demo: boolean) => {
    const notTest = demo ? {} : { isTest: false };
    return prisma.listing.findMany({
      where: { status: "ACTIVE", provider: { status: "ACTIVE", user: notTest } },
      orderBy: [{ provider: { ratingCached: "desc" } }, { createdAt: "desc" }],
      take: 40,
      include: {
        provider: {
          select: { userId: true, displayName: true, city: true, travelRadiusKm: true, ratingCached: true, jobsCount: true },
        },
        category: { select: { slug: true } },
      },
    });
  },
  ["home-listings"],
  { tags: [LISTINGS_TAG], revalidate: 60 },
);

// Пересчёт кешированного рейтинга и числа заказов исполнителя.
// jobsCount - число реально проведённых заказов (COMPLETED/CLOSED).
//
// Рейтинг (ratingCached) стартует у всех с 5.0 и дальше держится или снижается по
// реальным отзывам (выше 5 не поднимается). Реализовано как «байесовское»
// среднее: у каждого исполнителя как будто уже есть RATING_PRIOR_COUNT отзывов по
// RATING_PRIOR_VALUE звёзд. Пока реальных отзывов мало - рейтинг близок к 5;
// с накоплением плохих оценок плавно падает.
//   rating = (PRIOR_COUNT*PRIOR_VALUE + сумма_реальных_звёзд) / (PRIOR_COUNT + число_отзывов)
// Вызывается после создания, изменения и удаления отзыва, а также после выплаты.
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Сила «стартовой пятёрки»: эквивалент такого числа виртуальных отзывов по 5.
// Больше значение - медленнее падение (дольше держится 5). Меняется здесь.
export const RATING_PRIOR_COUNT = 5;
export const RATING_PRIOR_VALUE = 5;

// Байесовский рейтинг из суммы и числа реальных звёзд (старт - 5.0 при нуле отзывов).
export function bayesianRating(sumStars: number, count: number): number {
  const r = (RATING_PRIOR_COUNT * RATING_PRIOR_VALUE + sumStars) / (RATING_PRIOR_COUNT + count);
  return Math.round(r * 100) / 100; // 2 знака, как Decimal(3,2)
}

export async function recomputeRating(providerUserId: string): Promise<void> {
  try {
    const [agg, jobs, profile] = await Promise.all([
      prisma.review.aggregate({
        where: { targetId: providerUserId, publishedAt: { not: null } },
        _sum: { stars: true },
        _count: { _all: true },
      }),
      prisma.booking.count({
        where: {
          providerId: providerUserId,
          status: { in: [BookingStatus.COMPLETED, BookingStatus.CLOSED] },
        },
      }),
      prisma.providerProfile.findUnique({
        where: { userId: providerUserId },
        select: { ratingManual: true },
      }),
    ]);

    const auto = new Prisma.Decimal(bayesianRating(agg._sum.stars ?? 0, agg._count._all));
    // Ручной рейтинг от администратора имеет приоритет: если задан, автоматический
    // пересчёт его не перетирает.
    const rating = profile?.ratingManual != null ? profile.ratingManual : auto;

    await prisma.providerProfile.update({
      where: { userId: providerUserId },
      data: { ratingCached: rating, jobsCount: jobs },
    });
  } catch (e) {
    console.error("recomputeRating failed", providerUserId, e);
  }
}

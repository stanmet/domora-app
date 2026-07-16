// Пересчёт кешированного рейтинга и числа заказов исполнителя.
// Рейтинг (ratingCached) - среднее по опубликованным отзывам, полученным
// исполнителем. jobsCount - число реально проведённых заказов (COMPLETED/CLOSED).
// Вызывается после создания, изменения и удаления отзыва, а также после выплаты.
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function recomputeRating(providerUserId: string): Promise<void> {
  try {
    const [agg, jobs] = await Promise.all([
      prisma.review.aggregate({
        where: { targetId: providerUserId, publishedAt: { not: null } },
        _avg: { stars: true },
        _count: { _all: true },
      }),
      prisma.booking.count({
        where: {
          providerId: providerUserId,
          status: { in: [BookingStatus.COMPLETED, BookingStatus.CLOSED] },
        },
      }),
    ]);

    const avg = agg._avg.stars ?? 0;
    // Округляем до 2 знаков, как Decimal(3,2) в схеме.
    const rating = new Prisma.Decimal(Math.round(avg * 100) / 100);

    await prisma.providerProfile.update({
      where: { userId: providerUserId },
      data: { ratingCached: rating, jobsCount: jobs },
    });
  } catch (e) {
    console.error("recomputeRating failed", providerUserId, e);
  }
}

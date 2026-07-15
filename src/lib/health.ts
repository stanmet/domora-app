// Здоровье-метрики исполнителя (docs/domora-spec.md 6.2): доля принятых
// запросов и доля отмен. Ниже порогов профиль перестаёт быть "здоровым"
// (уходит из топ-подборок, исполнителю показываем предупреждение).
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const MIN_ACCEPTANCE = 0.6; // 60%
export const MAX_CANCELLATION = 0.05; // 5%
const MIN_VOLUME = 5; // до этого числа заказов метрики не штрафуют (cold start)

export type ProviderHealth = {
  acceptanceRate: number | null;
  cancellationRate: number | null;
  handled: number;
  healthy: boolean;
};

export async function providerHealth(userId: string): Promise<ProviderHealth> {
  try {
    const grouped = await prisma.booking.groupBy({
      by: ["status"],
      where: { providerId: userId },
      _count: { _all: true },
    });
    const count = (s: BookingStatus) => grouped.find((g) => g.status === s)?._count._all ?? 0;

    // Принятыми считаем всё, что прошло дальше REQUESTED.
    const accepted =
      count(BookingStatus.ACCEPTED) +
      count(BookingStatus.IN_PROGRESS) +
      count(BookingStatus.COMPLETED) +
      count(BookingStatus.CLOSED) +
      count(BookingStatus.DISPUTED) +
      count(BookingStatus.CANCELLED_BY_CLIENT) +
      count(BookingStatus.CANCELLED_BY_PROVIDER);
    const declined = count(BookingStatus.DECLINED) + count(BookingStatus.EXPIRED);
    const decided = accepted + declined;
    const cancelledByPro = count(BookingStatus.CANCELLED_BY_PROVIDER);

    const acceptanceRate = decided > 0 ? accepted / decided : null;
    const cancellationRate = accepted > 0 ? cancelledByPro / accepted : null;
    const handled = decided;

    // До набора статистики считаем профиль здоровым (даём шанс новичку).
    const healthy =
      handled < MIN_VOLUME ||
      ((acceptanceRate === null || acceptanceRate >= MIN_ACCEPTANCE) &&
        (cancellationRate === null || cancellationRate <= MAX_CANCELLATION));

    return { acceptanceRate, cancellationRate, handled, healthy };
  } catch {
    return { acceptanceRate: null, cancellationRate: null, handled: 0, healthy: true };
  }
}

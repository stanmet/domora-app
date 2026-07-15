// Отмены, возвраты и страйки (docs/domora-spec.md, разделы 4 и 6).
// Площадка - посредник и агент по платежу, не сторона сделки: возвраты идут
// строго по тирам, решения по спорам принимает человек-арбитр, а не автоматика.
import { ListingStatus, PaymentStatus, ProviderStatus, StrikeType, TaskStatus, type Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { releaseBookingHold } from "@/lib/payments";
import { notify } from "@/lib/notify";

export const STRIKE_TTL_DAYS = 90;
// Порог: при скольких активных страйках профиль исполнителя замораживается.
export const STRIKE_FREEZE_AT = 2;

export type RefundLabel = "full" | "half" | "fee" | "none";

// Сколько вернуть заказчику при его отмене после подтверждения, по тиру категории
// и времени до начала (spec 4.1). Сбор возвращается только в самом позднем тире.
export function refundCentsForCancel(opts: {
  tier: string;
  totalCents: number;
  clientFeeCents: number;
  dateStart: Date;
  now?: Date;
}): { refundCents: number; label: RefundLabel } {
  const now = opts.now ?? new Date();
  const hours = (opts.dateStart.getTime() - now.getTime()) / 3_600_000;

  if (opts.tier === "event") {
    const days = hours / 24;
    if (days > 14) return { refundCents: opts.totalCents, label: "full" };
    if (days >= 7) return { refundCents: Math.round(opts.totalCents * 0.5), label: "half" };
    return { refundCents: opts.clientFeeCents, label: "fee" };
  }

  if (hours > 48) return { refundCents: opts.totalCents, label: "full" };
  if (hours >= 24) return { refundCents: Math.round(opts.totalCents * 0.5), label: "half" };
  return { refundCents: opts.clientFeeCents, label: "fee" };
}

// Возврат заказчику. Если холд ещё не списан - снимаем холд (деньги не удержаны).
// Если списан - частичный/полный Stripe Refund. Идемпотентность обеспечивает
// уникальность stripeRefundId и ограничение суммой остатка.
export async function refundToClient(bookingId: string, amountCents: number, reason: string): Promise<void> {
  const payment: Payment | null = await prisma.payment.findUnique({ where: { bookingId } });
  if (!payment) return;

  if (payment.status === PaymentStatus.HOLD) {
    await releaseBookingHold(payment).catch((e) => console.error("release on cancel failed", bookingId, e));
    return;
  }
  if (amountCents <= 0) return;
  if (payment.status !== PaymentStatus.CAPTURED && payment.status !== PaymentStatus.PARTIAL_REFUND) return;

  const already = await prisma.refund.aggregate({ where: { paymentId: payment.id }, _sum: { amountCents: true } });
  const refunded = already._sum.amountCents ?? 0;
  const remaining = payment.amountCents - refunded;
  const amount = Math.min(amountCents, remaining);
  if (amount <= 0) return;

  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    amount,
    metadata: { bookingId, reason },
  });

  const fully = refunded + amount >= payment.amountCents;
  await prisma.$transaction([
    prisma.refund.create({ data: { paymentId: payment.id, stripeRefundId: refund.id, amountCents: amount, reason } }),
    prisma.payment.update({
      where: { bookingId },
      data: { status: fully ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUND },
    }),
  ]);
}

// Страйк исполнителю/заказчику. Живёт 90 дней. При достижении порога активных
// страйков профиль исполнителя замораживается (уходит из каталога).
export async function applyStrike(userId: string, type: StrikeType, bookingId?: string): Promise<void> {
  const expiresAt = new Date(Date.now() + STRIKE_TTL_DAYS * 24 * 3600 * 1000);
  try {
    await prisma.strike.create({ data: { userId, type, bookingId: bookingId ?? null, expiresAt } });
    const active = await prisma.strike.count({ where: { userId, expiresAt: { gt: new Date() } } });
    if (active >= STRIKE_FREEZE_AT) {
      await prisma.providerProfile.updateMany({ where: { userId }, data: { status: ProviderStatus.FROZEN } });
    }
  } catch (e) {
    console.error("applyStrike failed", userId, type, e);
  }
}

// Авто-подбор замены (spec 4.2): если бронь была из задачи, снова открываем
// задачу и зовём топ-5 подходящих исполнителей города, кроме выбывшего.
export async function reopenTaskAndFindReplacements(bookingId: string, excludeProviderId: string): Promise<void> {
  try {
    const task = await prisma.task.findFirst({
      where: { bookingId },
      select: { id: true, categoryId: true, city: true },
    });
    if (!task) return;

    await prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.OPEN, bookingId: null, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
    });

    const pros = await prisma.providerProfile.findMany({
      where: {
        status: ProviderStatus.ACTIVE,
        city: task.city,
        userId: { not: excludeProviderId },
        listings: { some: { status: ListingStatus.ACTIVE, categoryId: task.categoryId } },
      },
      orderBy: { ratingCached: "desc" },
      take: 5,
      select: { userId: true },
    });
    for (const p of pros) await notify(p.userId, "replacement", { taskId: task.id });
  } catch (e) {
    console.error("reopenTaskAndFindReplacements failed", bookingId, e);
  }
}

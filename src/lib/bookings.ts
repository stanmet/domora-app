// Серверная логика бронирований: ленивое истечение запросов без ответа.
// Спецификация: запрос живет 72 часа (docs/domora-spec.md, раздел 2.1).
// Отдельного воркера пока нет, поэтому просроченные REQUESTED помечаются
// EXPIRED при открытии списков заказов; холд на карте снимается (cancel
// PaymentIntent), каждый переход пишется в BookingEvent.
import { BookingStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { releaseBookingHold } from "@/lib/payments";

export async function expireOverdueRequests(where: Prisma.BookingWhereInput): Promise<void> {
  const overdue = await prisma.booking.findMany({
    where: { ...where, status: BookingStatus.REQUESTED, requestExpiresAt: { lt: new Date() } },
    select: { id: true, payment: true },
  });
  if (overdue.length === 0) return;

  for (const b of overdue) {
    // Если Stripe недоступен, все равно помечаем EXPIRED: холд снимет
    // вебхук charge.refunded или он истечет сам (авторизация живет 7 дней).
    await releaseBookingHold(b.payment).catch((e) => console.error("release on expire failed", b.id, e));
  }

  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { id: { in: overdue.map((b) => b.id) } },
      data: { status: BookingStatus.EXPIRED },
    }),
    prisma.bookingEvent.createMany({
      data: overdue.map((b) => ({
        bookingId: b.id,
        actorId: null,
        type: "status_change",
        payload: { to: BookingStatus.EXPIRED, reason: "request_timeout" },
      })),
    }),
  ]);
}

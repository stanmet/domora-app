"use server";

// Ответ исполнителя на запрос брони: принять или отклонить.
// Принятие списывает холд (Stripe capture, идемпотентно), отказ снимает холд
// (cancel PaymentIntent). Каждый переход статуса пишется в BookingEvent.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { captureBookingPayment, releaseBookingHold } from "@/lib/payments";
import { DISPUTE_WINDOW_HOURS } from "@/lib/booking-units";

async function respondToRequest(bookingId: string, next: BookingStatus): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/bookings");
  const user = await ensureDbUser(authUser, await getLocale());

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
  if (!booking || booking.providerId !== user.id || booking.status !== BookingStatus.REQUESTED) {
    revalidatePath("/pro/bookings");
    return;
  }

  // Срок ответа 72 часа вышел: запрос истекает вместо принятия или отказа.
  if (booking.requestExpiresAt && booking.requestExpiresAt.getTime() < Date.now()) {
    await releaseBookingHold(booking.payment).catch((e) => console.error("release on expire failed", e));
    await prisma.$transaction([
      prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.EXPIRED } }),
      prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          actorId: null,
          type: "status_change",
          payload: { to: BookingStatus.EXPIRED, reason: "request_timeout" },
        },
      }),
    ]);
    revalidatePath("/pro/bookings");
    return;
  }

  const hasHold = booking.payment?.status === PaymentStatus.HOLD;

  if (next === BookingStatus.ACCEPTED && hasHold && booking.payment) {
    // Списание холда. Если Stripe недоступен, бронь остается REQUESTED,
    // исполнитель нажмет Принять еще раз (capture идемпотентен).
    try {
      await captureBookingPayment(booking.id, booking.payment.stripePaymentIntentId);
    } catch (e) {
      console.error("capture failed", booking.id, e);
      revalidatePath("/pro/bookings");
      return;
    }
  }

  if (next === BookingStatus.DECLINED && booking.payment) {
    // Отказ: снимаем холд, деньги возвращаются клиенту сразу.
    try {
      await releaseBookingHold(booking.payment);
    } catch (e) {
      console.error("release on decline failed", booking.id, e);
      revalidatePath("/pro/bookings");
      return;
    }
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id: booking.id }, data: { status: next } }),
    ...(next === BookingStatus.ACCEPTED && hasHold
      ? [
          prisma.payment.update({
            where: { bookingId: booking.id },
            data: { status: PaymentStatus.CAPTURED, capturedAt: new Date() },
          }),
        ]
      : []),
    prisma.bookingEvent.create({
      data: { bookingId: booking.id, actorId: user.id, type: "status_change", payload: { to: next } },
    }),
  ]);

  revalidatePath("/pro/bookings");
  revalidatePath("/bookings");
}

export async function acceptBooking(bookingId: string): Promise<void> {
  await respondToRequest(bookingId, BookingStatus.ACCEPTED);
}

export async function declineBooking(bookingId: string): Promise<void> {
  await respondToRequest(bookingId, BookingStatus.DECLINED);
}

// Исполнитель отмечает, что приступил к работе: ACCEPTED -> IN_PROGRESS.
export async function startBooking(bookingId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/bookings");
  const user = await ensureDbUser(authUser, await getLocale());

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { providerId: true, status: true } });
  if (!booking || booking.providerId !== user.id || booking.status !== BookingStatus.ACCEPTED) {
    revalidatePath("/pro/bookings");
    return;
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.IN_PROGRESS } }),
    prisma.bookingEvent.create({
      data: { bookingId, actorId: user.id, type: "status_change", payload: { to: BookingStatus.IN_PROGRESS } },
    }),
  ]);
  revalidatePath("/pro/bookings");
  revalidatePath("/bookings");
}

// Исполнитель отмечает работу выполненной: ACCEPTED|IN_PROGRESS -> COMPLETED.
// Открывается окно спора; по его истечении (или после подтверждения клиентом)
// уходит выплата.
export async function completeBooking(bookingId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/bookings");
  const user = await ensureDbUser(authUser, await getLocale());

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { providerId: true, status: true } });
  if (
    !booking ||
    booking.providerId !== user.id ||
    (booking.status !== BookingStatus.ACCEPTED && booking.status !== BookingStatus.IN_PROGRESS)
  ) {
    revalidatePath("/pro/bookings");
    return;
  }

  const disputeWindowEndsAt = new Date(Date.now() + DISPUTE_WINDOW_HOURS * 3600 * 1000);
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED, disputeWindowEndsAt },
    }),
    prisma.bookingEvent.create({
      data: { bookingId, actorId: user.id, type: "status_change", payload: { to: BookingStatus.COMPLETED } },
    }),
  ]);
  revalidatePath("/pro/bookings");
  revalidatePath("/bookings");
}

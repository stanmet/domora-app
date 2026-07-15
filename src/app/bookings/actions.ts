"use server";

// Действия клиента по завершению сделки:
// - confirmBooking: клиент подтверждает, что работа выполнена. Окно спора
//   закрывается сразу, запускается выплата исполнителю.
// - disputeBooking: клиент открывает спор (что-то пошло не так). Заказ уходит
//   в DISPUTED, выплата приостановлена, дальше разбирается админ (возвраты).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { processPayouts } from "@/lib/jobs";
import { notify } from "@/lib/notify";
import { refundCentsForCancel, refundToClient } from "@/lib/cancellation";
import { releaseBookingHold } from "@/lib/payments";

export async function confirmBooking(bookingId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/bookings`);
  const user = await ensureDbUser(authUser, await getLocale());

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { clientId: true, status: true },
  });
  if (!booking || booking.clientId !== user.id || booking.status !== BookingStatus.COMPLETED) {
    revalidatePath("/bookings");
    return;
  }

  // Подтверждение клиента закрывает окно спора немедленно.
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { disputeWindowEndsAt: new Date() } }),
    prisma.bookingEvent.create({
      data: { bookingId, actorId: user.id, type: "status_change", payload: { reason: "client_confirmed" } },
    }),
  ]);

  // Выплату пробуем провести сразу (best-effort); если Stripe исполнителя ещё
  // не готов, заказ останется COMPLETED и выплатится следующим проходом cron.
  await processPayouts().catch((e) => console.error("payout after confirm failed", e));

  revalidatePath("/bookings");
  revalidatePath("/pro/bookings");
}

export async function disputeBooking(bookingId: string, formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/bookings`);
  const user = await ensureDbUser(authUser, await getLocale());

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { clientId: true, providerId: true, status: true, dispute: { select: { id: true } } },
  });
  const disputable: BookingStatus[] = [BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED];
  if (!booking || booking.clientId !== user.id || !disputable.includes(booking.status) || booking.dispute) {
    revalidatePath("/bookings");
    return;
  }

  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  const deadlineAt = new Date(Date.now() + 72 * 3600 * 1000);

  try {
    await prisma.$transaction([
      prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.DISPUTED } }),
      prisma.dispute.create({
        data: { bookingId, openedById: user.id, reasonCode: "other", deadlineAt },
      }),
      prisma.bookingEvent.create({
        data: { bookingId, actorId: user.id, type: "status_change", payload: { to: BookingStatus.DISPUTED, reason } },
      }),
    ]);
  } catch (e) {
    console.error("disputeBooking failed", bookingId, e);
    revalidatePath("/bookings");
    return;
  }

  // Уведомляем исполнителя об открытии спора.
  await notify(booking.providerId, "dispute", { bookingId });

  revalidatePath("/bookings");
  revalidatePath("/pro/bookings");
  revalidatePath("/admin");
}

// Отмена заказчиком. До подтверждения исполнителем - бесплатно (снятие холда).
// После подтверждения - возврат по тиру категории (spec 4.1); остаток остаётся
// исполнителю как компенсация забронированного слота. Площадка не решает спор,
// а лишь применяет заранее показанную политику.
export async function cancelBooking(bookingId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/bookings`);
  const user = await ensureDbUser(authUser, await getLocale());

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      listing: { select: { category: { select: { cancellationTier: true } } } },
    },
  });
  const cancelable: BookingStatus[] = [BookingStatus.REQUESTED, BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS];
  if (!booking || booking.clientId !== user.id || !cancelable.includes(booking.status)) {
    revalidatePath("/bookings");
    return;
  }

  try {
    if (booking.status === BookingStatus.REQUESTED) {
      // Холд ещё не списан: просто снимаем, деньги не удерживались.
      await releaseBookingHold(booking.payment).catch((e) => console.error("release on client cancel", e));
    } else {
      const { refundCents } = refundCentsForCancel({
        tier: booking.listing.category.cancellationTier,
        totalCents: booking.totalCents,
        clientFeeCents: booking.clientFeeCents,
        dateStart: booking.dateStart,
      });
      await refundToClient(bookingId, refundCents, "client_cancel");
    }

    await prisma.$transaction([
      prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CANCELLED_BY_CLIENT } }),
      prisma.bookingEvent.create({
        data: { bookingId, actorId: user.id, type: "status_change", payload: { to: BookingStatus.CANCELLED_BY_CLIENT } },
      }),
    ]);
  } catch (e) {
    console.error("cancelBooking failed", bookingId, e);
    revalidatePath("/bookings");
    return;
  }

  await notify(booking.providerId, "client_cancelled", { bookingId });
  revalidatePath("/bookings");
  revalidatePath("/pro/bookings");
}

// "Исполнитель не пришёл": доступно через 30 минут после времени начала.
// Спорный факт, поэтому не авто-возврат, а открытие спора (reasonCode no_show),
// который разбирает поддержка. Так площадка остаётся нейтральным посредником.
export async function reportNoShow(bookingId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/bookings`);
  const user = await ensureDbUser(authUser, await getLocale());

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { clientId: true, providerId: true, status: true, dateStart: true, dispute: { select: { id: true } } },
  });
  const okStatus: BookingStatus[] = [BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS];
  const graceOver = booking ? Date.now() > booking.dateStart.getTime() + 30 * 60 * 1000 : false;
  if (!booking || booking.clientId !== user.id || !okStatus.includes(booking.status) || !graceOver || booking.dispute) {
    revalidatePath("/bookings");
    return;
  }

  const deadlineAt = new Date(Date.now() + 72 * 3600 * 1000);
  try {
    await prisma.$transaction([
      prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.DISPUTED } }),
      prisma.dispute.create({ data: { bookingId, openedById: user.id, reasonCode: "no_show", deadlineAt } }),
      prisma.bookingEvent.create({
        data: { bookingId, actorId: user.id, type: "status_change", payload: { to: BookingStatus.DISPUTED, reason: "no_show" } },
      }),
    ]);
  } catch (e) {
    console.error("reportNoShow failed", bookingId, e);
    revalidatePath("/bookings");
    return;
  }

  await notify(booking.providerId, "dispute", { bookingId, reason: "no_show" });
  revalidatePath("/bookings");
  revalidatePath("/pro/bookings");
  revalidatePath("/admin");
}

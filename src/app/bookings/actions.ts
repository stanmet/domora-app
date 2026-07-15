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

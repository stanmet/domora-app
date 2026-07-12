"use server";

// Ответ исполнителя на запрос брони: принять или отклонить.
// Каждый переход статуса пишется в BookingEvent (аудит-лог по спецификации).
// Списание холда (Stripe capture) добавится сюда при подключении платежей.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";

async function respondToRequest(bookingId: string, next: BookingStatus): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/bookings");
  const user = await ensureDbUser(authUser, await getLocale());

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.providerId !== user.id || booking.status !== BookingStatus.REQUESTED) {
    revalidatePath("/pro/bookings");
    return;
  }

  // Срок ответа 72 часа вышел: запрос истекает вместо принятия или отказа.
  if (booking.requestExpiresAt && booking.requestExpiresAt.getTime() < Date.now()) {
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

  await prisma.$transaction([
    prisma.booking.update({ where: { id: booking.id }, data: { status: next } }),
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

"use server";

// Оплата брони, созданной при выборе отклика на доске задач. Бронь уже в статусе
// DRAFT с зафиксированной ценой из отклика, здесь только холд на карте и переход
// DRAFT -> REQUESTED (тем же ядром, что и обычная бронь).
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { createOrUpdateBookingHold } from "@/lib/payments";

export type HoldResult = { error: string } | { clientSecret: string };

export async function createTaskHold(bookingId: string): Promise<HoldResult> {
  const locale = await getLocale();
  const t = getDict(locale);

  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");
  const user = await ensureDbUser(authUser, locale);

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.clientId !== user.id) return { error: t.errGeneric };
  if (booking.status !== BookingStatus.DRAFT) return { error: t.errGeneric };
  // Нельзя оплачивать бронь на прошедшую дату (услуга «в прошлом»).
  if (booking.dateStart.getTime() <= Date.now()) return { error: t.errPast };

  try {
    const { clientSecret } = await createOrUpdateBookingHold({
      bookingId: booking.id,
      totalCents: booking.totalCents,
      email: user.email,
    });
    return { clientSecret };
  } catch (e) {
    console.error("createTaskHold failed", e);
    return { error: t.payUnavailable };
  }
}

"use server";

// Отзывы заказчика об исполнителе (docs/domora-spec.md, раздел про отзывы).
// Отзыв можно оставить только по своему завершённому заказу (COMPLETED/CLOSED),
// один отзыв на заказ (ограничение @@unique в схеме). После любого изменения
// пересчитываем рейтинг исполнителя.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { recomputeRating } from "@/lib/reviews";
import { rateLimit } from "@/lib/rate-limit";

const REVIEWABLE: BookingStatus[] = [BookingStatus.COMPLETED, BookingStatus.CLOSED];

function parseStars(raw: FormDataEntryValue | null): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

// Создать отзыв. Публикуем сразу (простой режим): заказчик уже завершил заказ.
export async function submitReview(bookingId: string, formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");
  const user = await ensureDbUser(authUser, await getLocale());
  if (!rateLimit(`review:${user.id}`, 30, 60 * 60 * 1000)) {
    revalidatePath("/bookings");
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { clientId: true, providerId: true, status: true },
  });
  if (!booking || booking.clientId !== user.id || !REVIEWABLE.includes(booking.status)) {
    revalidatePath("/bookings");
    return;
  }

  const stars = parseStars(formData.get("stars"));
  if (!stars) {
    revalidatePath("/bookings");
    return;
  }
  const text = String(formData.get("text") ?? "").trim().slice(0, 1000) || null;

  try {
    await prisma.review.create({
      data: {
        bookingId,
        authorId: user.id,
        targetId: booking.providerId,
        stars,
        text,
        textLang: (await getLocale()),
        publishedAt: new Date(),
      },
    });
  } catch (e) {
    // Уникальный ключ (bookingId, authorId): отзыв уже есть, тихо выходим.
    console.error("submitReview failed", bookingId, e);
    revalidatePath("/bookings");
    return;
  }

  await recomputeRating(booking.providerId);
  revalidatePath("/bookings");
  revalidatePath(`/providers/${booking.providerId}`);
}

// Изменить свой отзыв.
export async function editReview(bookingId: string, formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");
  const user = await ensureDbUser(authUser, await getLocale());

  const stars = parseStars(formData.get("stars"));
  if (!stars) {
    revalidatePath("/bookings");
    return;
  }
  const text = String(formData.get("text") ?? "").trim().slice(0, 1000) || null;

  const review = await prisma.review.findUnique({
    where: { bookingId_authorId: { bookingId, authorId: user.id } },
    select: { id: true, targetId: true },
  });
  if (!review) {
    revalidatePath("/bookings");
    return;
  }

  await prisma.review.update({ where: { id: review.id }, data: { stars, text } });
  await recomputeRating(review.targetId);
  revalidatePath("/bookings");
  revalidatePath(`/providers/${review.targetId}`);
}

// Удалить свой отзыв.
export async function deleteReview(bookingId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");
  const user = await ensureDbUser(authUser, await getLocale());

  const review = await prisma.review.findUnique({
    where: { bookingId_authorId: { bookingId, authorId: user.id } },
    select: { id: true, targetId: true },
  });
  if (!review) {
    revalidatePath("/bookings");
    return;
  }

  await prisma.review.delete({ where: { id: review.id } });
  await recomputeRating(review.targetId);
  revalidatePath("/bookings");
  revalidatePath(`/providers/${review.targetId}`);
}

// --- Отзыв исполнителя о клиенте (вторая сторона) ---
// Исполнитель оценивает клиента по своему завершённому заказу. Автор - исполнитель,
// цель - клиент. Уникальный ключ (bookingId, authorId) не даёт задвоить отзыв и не
// мешает отзыву клиента (у него другой authorId).
export async function submitClientReview(bookingId: string, formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/bookings");
  const user = await ensureDbUser(authUser, await getLocale());

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { clientId: true, providerId: true, status: true },
  });
  if (!booking || booking.providerId !== user.id || !REVIEWABLE.includes(booking.status)) {
    revalidatePath("/pro/bookings");
    return;
  }

  const stars = parseStars(formData.get("stars"));
  if (!stars) {
    revalidatePath("/pro/bookings");
    return;
  }
  const text = String(formData.get("text") ?? "").trim().slice(0, 1000) || null;

  try {
    await prisma.review.create({
      data: {
        bookingId,
        authorId: user.id,
        targetId: booking.clientId,
        stars,
        text,
        textLang: await getLocale(),
        publishedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("submitClientReview failed", bookingId, e);
  }
  revalidatePath("/pro/bookings");
}

export async function editClientReview(bookingId: string, formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/bookings");
  const user = await ensureDbUser(authUser, await getLocale());

  const stars = parseStars(formData.get("stars"));
  if (!stars) {
    revalidatePath("/pro/bookings");
    return;
  }
  const text = String(formData.get("text") ?? "").trim().slice(0, 1000) || null;

  const review = await prisma.review.findUnique({
    where: { bookingId_authorId: { bookingId, authorId: user.id } },
    select: { id: true },
  });
  if (!review) {
    revalidatePath("/pro/bookings");
    return;
  }
  await prisma.review.update({ where: { id: review.id }, data: { stars, text } });
  revalidatePath("/pro/bookings");
}

export async function deleteClientReview(bookingId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/bookings");
  const user = await ensureDbUser(authUser, await getLocale());

  const review = await prisma.review.findUnique({
    where: { bookingId_authorId: { bookingId, authorId: user.id } },
    select: { id: true },
  });
  if (!review) {
    revalidatePath("/pro/bookings");
    return;
  }
  await prisma.review.delete({ where: { id: review.id } });
  revalidatePath("/pro/bookings");
}

// Жалоба на отзыв: доступна исполнителю, о котором отзыв. Ставим флаг для
// модерации (админ видит отмеченные отзывы и может их удалить).
export async function flagReview(reviewId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  const user = await ensureDbUser(authUser, await getLocale());

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { targetId: true },
  });
  if (!review || review.targetId !== user.id) return;

  await prisma.review.update({ where: { id: reviewId }, data: { disputeFlag: true } });
  revalidatePath(`/providers/${user.id}`);
}

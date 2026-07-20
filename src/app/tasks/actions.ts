"use server";

// Действия доски задач:
// - createOffer: отклик исполнителя на задачу (проверки категории, лимита 5,
//   фильтр контактов в тексте);
// - acceptOffer: клиент выбирает отклик, создаётся бронь по цене из отклика,
//   остальные отклики становятся REJECTED, задача переходит в OFFER_ACCEPTED,
//   клиент отправляется на оплату (наш обычный флоу холда).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus, ListingStatus, OfferStatus, PriceUnit, Role, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { genBookingRef } from "@/lib/booking-ref";
import { filterContacts } from "@/lib/contact-filter";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_OFFERS_PER_TASK } from "@/lib/tasks";
import { notify } from "@/lib/notify";
import { isDemoMode } from "@/lib/test-users/bots";

export type OfferState = { ok: true } | { error: string } | null;

export async function createOffer(_prev: OfferState, formData: FormData): Promise<OfferState> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) return { error: t.tasksProvidersOnly };

  // Анти-спам: не более 30 откликов в час с аккаунта.
  if (!rateLimit(`offer:${user.id}`, 30, 60 * 60 * 1000)) return { error: t.errGeneric };

  const taskId = String(formData.get("taskId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  if (!taskId || !message || !Number.isFinite(price) || price <= 0) {
    return { error: t.errOfferForm };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { client: { select: { isTest: true } } },
  });
  // Тестовые задачи скрыты от реальных исполнителей: откликнуться нельзя даже
  // по прямой ссылке. В демо-режиме отклик на задачу бота разрешён (бот-клиент
  // сам примет отклик по сценарию).
  const demo = task?.client.isTest ? await isDemoMode() : false;
  if (
    !task ||
    (task.client.isTest && !demo) ||
    task.status !== TaskStatus.OPEN ||
    task.expiresAt.getTime() < Date.now()
  ) {
    return { error: t.offerClosed };
  }
  if (task.clientId === user.id) return { error: t.offerNoListing };

  // Откликаться можно только с активной услугой в категории задачи.
  const hasListing = await prisma.listing.findFirst({
    where: { providerId: user.id, categoryId: task.categoryId, status: ListingStatus.ACTIVE },
    select: { id: true },
  });
  if (!hasListing) return { error: t.offerNoListing };

  // Максимум 5 откликов на задачу.
  const offerCount = await prisma.offer.count({ where: { taskId } });
  if (offerCount >= MAX_OFFERS_PER_TASK) return { error: t.offerMax };

  // Фильтр контактов: телефоны, email и ссылки скрываются с предупреждением.
  const filtered = filterContacts(message, t.contactRedacted);

  try {
    await prisma.offer.create({
      data: {
        taskId,
        providerId: user.id,
        priceCents: Math.round(price * 100),
        message: filtered.text,
        contactFilterFlag: filtered.flagged,
        status: OfferStatus.PENDING,
      },
    });
    // Уведомляем автора задачи о новом отклике.
    await notify(task.clientId, "new_offer", { taskId });
  } catch (e) {
    // Уникальный индекс (taskId, providerId): повторный отклик запрещён.
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return { error: t.offerExists };
    }
    console.error("createOffer failed", e);
    return { error: t.errGeneric };
  }

  revalidatePath("/tasks");
  return { ok: true };
}

// Исполнитель отзывает свой отклик (пока задача открыта и отклик не принят).
export async function withdrawOffer(offerId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks");
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { task: { select: { id: true, status: true } } },
  });
  if (!offer || offer.providerId !== user.id || offer.status !== OfferStatus.PENDING || offer.task.status !== TaskStatus.OPEN) {
    revalidatePath(`/tasks/${offer?.task.id ?? ""}`);
    return;
  }

  await prisma.offer.delete({ where: { id: offerId } });
  revalidatePath(`/tasks/${offer.task.id}`);
  revalidatePath("/tasks");
}

// Клиент выбирает исполнителя (V1 без оплаты). Создаём заказ-«карточку работы»
// сразу в статусе IN_PROGRESS (без Stripe, без комиссий), открываем чат,
// раскрываем контакты обеим сторонам. Остальные отклики отклоняются.
export async function acceptOffer(offerId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/mine");
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { task: true },
  });
  if (!offer || offer.status !== OfferStatus.PENDING) {
    revalidatePath("/tasks/mine");
    return;
  }
  const task = offer.task;
  if (task.clientId !== user.id || task.status !== TaskStatus.OPEN) {
    revalidatePath("/tasks/mine");
    return;
  }
  // Нельзя выбрать исполнителя на задачу с прошедшей желаемой датой.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (task.dateWanted && task.dateWanted.getTime() < startOfToday.getTime()) {
    revalidatePath("/tasks/mine");
    return;
  }

  // Заказ ссылается на активную услугу исполнителя в категории задачи
  // (обязательное поле listingId). Она гарантированно есть: без неё отклик
  // не создаётся. Цена берётся из отклика, не из плашки.
  const listing = await prisma.listing.findFirst({
    where: { providerId: offer.providerId, categoryId: task.categoryId, status: ListingStatus.ACTIVE },
    select: { id: true },
  });
  if (!listing) {
    revalidatePath("/tasks/mine");
    return;
  }

  const dateStart = task.dateWanted ?? new Date(Date.now() + 24 * 3600 * 1000);

  await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        clientId: user.id,
        providerId: offer.providerId,
        listingId: listing.id,
        ref: genBookingRef(),
        // Без оплаты: заказ сразу "В работе". Комиссии нулевые.
        status: BookingStatus.IN_PROGRESS,
        dateStart,
        qty: 1,
        unit: PriceUnit.PER_EVENT,
        priceCentsSnapshot: offer.priceCents,
        subtotalCents: offer.priceCents,
        clientFeeCents: 0,
        providerFeeCents: 0,
        totalCents: offer.priceCents,
        addressEncrypted: task.addressEncrypted,
        events: {
          create: {
            actorId: user.id,
            type: "status_change",
            payload: { to: BookingStatus.IN_PROGRESS, reason: "task_offer_accepted", taskId: task.id, offerId },
          },
        },
        // Сообщение исполнителя из отклика переносим в чат заказа.
        thread: {
          create: { messages: { create: { authorId: offer.providerId, textOriginal: offer.message, langOriginal: locale } } },
        },
      },
    });

    await tx.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.OFFER_ACCEPTED, bookingId: created.id },
    });
    await tx.offer.update({ where: { id: offer.id }, data: { status: OfferStatus.ACCEPTED } });
    await tx.offer.updateMany({
      where: { taskId: task.id, id: { not: offer.id } },
      data: { status: OfferStatus.REJECTED },
    });
  });

  // Уведомляем исполнителя, что его выбрали: теперь открыты контакты и чат.
  await notify(offer.providerId, "offer_accepted", { taskId: task.id });

  revalidatePath("/tasks/mine");
  redirect(`/tasks/${task.id}`);
}

// Клиент отмечает заказ выполненным. Заказ переходит в COMPLETED (без окна
// спора - выплатной cron его не трогает), задача закрывается. После этого обе
// стороны могут оставить отзыв.
export async function markTaskDone(taskId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/mine");
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { booking: { select: { id: true, status: true, providerId: true } } },
  });
  if (!task || task.clientId !== user.id || !task.booking) {
    revalidatePath(`/tasks/${taskId}`);
    return;
  }
  if (task.booking.status !== BookingStatus.IN_PROGRESS) {
    revalidatePath(`/tasks/${taskId}`);
    return;
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id: task.booking.id }, data: { status: BookingStatus.COMPLETED } }),
    prisma.bookingEvent.create({
      data: { bookingId: task.booking.id, actorId: user.id, type: "status_change", payload: { to: BookingStatus.COMPLETED, reason: "client_marked_done" } },
    }),
    prisma.task.update({ where: { id: taskId }, data: { status: TaskStatus.CLOSED } }),
  ]);

  await notify(task.booking.providerId, "completed", { taskId });

  revalidatePath(`/tasks/${taskId}`);
}

// Отмена согласованного заказа (клиентом). Заказ переходит в CANCELLED_BY_CLIENT,
// задача закрывается.
export async function cancelAcceptedTask(taskId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/mine");
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { booking: { select: { id: true, status: true, providerId: true } } },
  });
  if (!task || task.clientId !== user.id || !task.booking) {
    revalidatePath(`/tasks/${taskId}`);
    return;
  }
  if (task.booking.status !== BookingStatus.IN_PROGRESS) {
    revalidatePath(`/tasks/${taskId}`);
    return;
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id: task.booking.id }, data: { status: BookingStatus.CANCELLED_BY_CLIENT } }),
    prisma.bookingEvent.create({
      data: { bookingId: task.booking.id, actorId: user.id, type: "status_change", payload: { to: BookingStatus.CANCELLED_BY_CLIENT, reason: "client_cancelled" } },
    }),
    prisma.task.update({ where: { id: taskId }, data: { status: TaskStatus.CLOSED } }),
  ]);

  await notify(task.booking.providerId, "client_cancelled", { taskId });

  revalidatePath(`/tasks/${taskId}`);
}

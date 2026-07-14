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
import { calcBooking } from "@/lib/stripe";
import { filterContacts } from "@/lib/contact-filter";
import { MAX_OFFERS_PER_TASK } from "@/lib/tasks";

export type OfferState = { ok: true } | { error: string } | null;

export async function createOffer(_prev: OfferState, formData: FormData): Promise<OfferState> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) return { error: t.tasksProvidersOnly };

  const taskId = String(formData.get("taskId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  if (!taskId || !message || !Number.isFinite(price) || price <= 0) {
    return { error: t.errOfferForm };
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.status !== TaskStatus.OPEN || task.expiresAt.getTime() < Date.now()) {
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

// Клиент выбирает отклик. Создаём бронь по цене из отклика и ведём на оплату.
export async function acceptOffer(offerId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/mine");
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { task: { include: { category: true } } },
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

  // Бронь ссылается на активную услугу исполнителя в категории задачи
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

  const money = calcBooking(
    offer.priceCents,
    1,
    Number(task.category.clientFeePct),
    Number(task.category.providerFeePct),
  );
  const dateStart = task.dateWanted ?? new Date(Date.now() + 24 * 3600 * 1000);

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        clientId: user.id,
        providerId: offer.providerId,
        listingId: listing.id,
        status: BookingStatus.DRAFT,
        dateStart,
        qty: 1,
        unit: PriceUnit.PER_EVENT,
        priceCentsSnapshot: offer.priceCents,
        subtotalCents: money.subtotal,
        clientFeeCents: money.clientFee,
        providerFeeCents: money.providerFee,
        totalCents: money.total,
        addressEncrypted: task.addressEncrypted,
        events: {
          create: {
            actorId: user.id,
            type: "status_change",
            payload: { to: BookingStatus.DRAFT, reason: "task_offer_accepted", taskId: task.id, offerId },
          },
        },
        // Сообщение исполнителя из отклика переносим в чат брони.
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

    return created;
  });

  redirect(`/bookings/${booking.id}/pay`);
}

"use server";

// Действия админки. Каждое проверяет роль ADMIN и пишет запись в AdminAction
// в той же транзакции, что и само изменение (docs/domora-spec.md: аудит админа).
import { revalidatePath, revalidateTag } from "next/cache";
import {
  BookingStatus,
  ListingStatus,
  PaymentStatus,
  Prisma,
  PriceUnit,
  ProviderStatus,
  Role,
  UserStatus,
} from "@prisma/client";
import { DisputeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { purgeUsers } from "@/lib/purge-user";
import { stripe } from "@/lib/stripe";
import { removeImage } from "@/lib/storage";
import { requireAdminScope, adminActionLog } from "@/lib/admin";
import { getLocale } from "@/i18n/server";
import { getAdminDict } from "./i18n";
import { notify } from "@/lib/notify";
import { refundToClient } from "@/lib/cancellation";
import { processPayouts } from "@/lib/jobs";
import { recomputeRating } from "@/lib/reviews";
import { CATEGORIES_TAG } from "@/lib/categories-cache";

// Одобрение услуги: MODERATION -> ACTIVE. Первое одобрение выводит профиль
// исполнителя в ACTIVE, после чего он и его услуги видны в каталоге.
export async function approveListing(listingId: string): Promise<void> {
  const admin = await requireAdminScope("moderation");

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== ListingStatus.MODERATION) return;

  const provider = await prisma.providerProfile.findUnique({ where: { userId: listing.providerId } });
  const activateProvider = provider != null && provider.status !== ProviderStatus.ACTIVE;

  await prisma.$transaction([
    prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.ACTIVE, moderationNote: null },
    }),
    ...(activateProvider
      ? [
          prisma.providerProfile.update({
            where: { userId: listing.providerId },
            data: { status: ProviderStatus.ACTIVE },
          }),
        ]
      : []),
    adminActionLog(admin.id, "listing", listingId, "approve"),
  ]);

  await notify(listing.providerId, "listing_approved", { listingId });

  revalidatePath("/admin");
  revalidatePath("/catalog");
}

// Полное удаление услуги (плашки). С бронями не удаляем - это история заказов;
// для таких лучше заморозка/отклонение. В модерации броней ещё нет.
export async function deleteListing(listingId: string): Promise<void> {
  const admin = await requireAdminScope("moderation");
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, _count: { select: { bookings: true } } },
  });
  if (!listing || listing._count.bookings > 0) return;
  await prisma.$transaction([
    prisma.listing.delete({ where: { id: listingId } }),
    adminActionLog(admin.id, "listing", listingId, "delete"),
  ]);
  revalidatePath("/admin");
  revalidatePath("/catalog");
}

// Отклонение услуги с комментарием для исполнителя.
export async function rejectListing(listingId: string, reason: string): Promise<void> {
  const admin = await requireAdminScope("moderation");
  const note = reason.trim().slice(0, 500) || null;

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== ListingStatus.MODERATION) return;

  await prisma.$transaction([
    prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.REJECTED, moderationNote: note },
    }),
    adminActionLog(admin.id, "listing", listingId, "reject", note ?? undefined),
  ]);

  await notify(listing.providerId, "listing_rejected", { listingId });

  revalidatePath("/admin");
}

// Заморозка и разблокировка пользователя (UserStatus ACTIVE <-> FROZEN).
export async function setUserFrozen(userId: string, frozen: boolean): Promise<void> {
  const admin = await requireAdminScope("users");
  if (userId === admin.id) return; // админ не замораживает сам себя

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { status: frozen ? UserStatus.FROZEN : UserStatus.ACTIVE },
    }),
    adminActionLog(admin.id, "user", userId, frozen ? "freeze" : "unblock"),
  ]);

  revalidatePath("/admin");
}

// Заморозка и разблокировка профиля исполнителя (ProviderStatus FROZEN <-> ACTIVE).
// Замороженный исполнитель и его услуги пропадают из каталога.
export async function setProviderFrozen(userId: string, frozen: boolean): Promise<void> {
  const admin = await requireAdminScope("providers");

  const provider = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!provider) return;

  await prisma.$transaction([
    prisma.providerProfile.update({
      where: { userId },
      data: { status: frozen ? ProviderStatus.FROZEN : ProviderStatus.ACTIVE },
    }),
    adminActionLog(admin.id, "provider", userId, frozen ? "freeze" : "unblock"),
  ]);

  revalidatePath("/admin");
  revalidatePath("/catalog");
}

// Рассылка сообщения от администратора. Доставляется как уведомление (колокольчик
// + страница /notifications) каждому получателю. Режимы: всем, только клиентам,
// только исполнителям или конкретным выбранным пользователям. Тестовые и
// самоудалённые аккаунты исключаются.
export type BroadcastResult = { ok: true; count: number } | { error: string };

export async function broadcastMessage(formData: FormData): Promise<BroadcastResult> {
  const admin = await requireAdminScope("broadcast");
  const t = getAdminDict(await getLocale());

  const text = String(formData.get("text") ?? "").trim().slice(0, 2000);
  if (!text) return { error: t.bcErrEmpty };

  const mode = String(formData.get("mode") ?? "selected");
  const ids = formData.getAll("userIds").map((v) => String(v)).filter(Boolean);

  const where: Prisma.UserWhereInput = { isTest: false, deletedAt: null };
  if (mode === "clients") where.roles = { has: Role.CLIENT };
  else if (mode === "providers") where.roles = { has: Role.PROVIDER };
  else if (mode === "selected") {
    if (ids.length === 0) return { error: t.bcErrNoRecipients };
    where.id = { in: ids };
  } else if (mode !== "all") {
    return { error: t.bcErrNoRecipients };
  }

  const recipients = await prisma.user.findMany({ where, select: { id: true } });
  if (recipients.length === 0) return { error: t.bcErrNoRecipients };

  await prisma.notification.createMany({
    data: recipients.map((r) => ({ userId: r.id, type: "admin_message", payload: { text } })),
  });
  await adminActionLog(admin.id, "broadcast", mode, "send", `${recipients.length} recipients`);

  revalidatePath("/admin");
  return { ok: true, count: recipients.length };
}

// Ручной рейтинг исполнителя. Пустое значение - вернуть автоматический подсчёт по
// отзывам; число 0..5 - зафиксировать рейтинг вручную (не перетирается пересчётом).
export async function setProviderRating(userId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminScope("providers");

  const provider = await prisma.providerProfile.findUnique({ where: { userId }, select: { userId: true } });
  if (!provider) return;

  const raw = String(formData.get("rating") ?? "").trim().replace(",", ".");
  let manual: Prisma.Decimal | null = null;
  if (raw !== "") {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 5) return; // вне диапазона - игнорируем
    manual = new Prisma.Decimal(Math.round(n * 100) / 100);
  }

  await prisma.$transaction([
    prisma.providerProfile.update({ where: { userId }, data: { ratingManual: manual } }),
    adminActionLog(admin.id, "provider", userId, manual ? `rating_set_${manual.toFixed(2)}` : "rating_auto"),
  ]);

  // Применяем сразу в ratingCached (пересчёт учитывает ручное значение).
  await recomputeRating(userId);

  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/");
  revalidatePath(`/providers/${userId}`);
}

export type RefundResult = { ok: true } | { error: string };

// Возврат денег клиенту через Stripe: полный или частичный. Возвращать можно
// только списанный платеж (CAPTURED или уже частично возвращенный). Сумма
// ограничивается остатком. Пишем Refund, обновляем статус Payment и лог.
export async function refundBooking(bookingId: string, amountEuros: number | "full"): Promise<RefundResult> {
  const admin = await requireAdminScope("bookings");
  const t = getAdminDict(await getLocale());

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  const payment = booking?.payment;
  if (!booking || !payment) return { error: t.errRefund };
  if (payment.status !== PaymentStatus.CAPTURED && payment.status !== PaymentStatus.PARTIAL_REFUND) {
    return { error: t.errRefund };
  }

  const already = await prisma.refund.aggregate({
    where: { paymentId: payment.id },
    _sum: { amountCents: true },
  });
  const refunded = already._sum.amountCents ?? 0;
  const remaining = payment.amountCents - refunded;
  if (remaining <= 0) return { error: t.errRefund };

  const requested = amountEuros === "full" ? remaining : Math.round(Number(amountEuros) * 100);
  if (!Number.isFinite(requested) || requested <= 0) return { error: t.errRefund };
  const amount = Math.min(requested, remaining);

  let stripeRefundId: string;
  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount,
      metadata: { bookingId, adminId: admin.id },
    });
    stripeRefundId = refund.id;
  } catch (e) {
    console.error("admin refund failed", bookingId, e);
    return { error: t.errRefund };
  }

  const fullyRefunded = refunded + amount >= payment.amountCents;

  await prisma.$transaction([
    prisma.refund.create({
      data: { paymentId: payment.id, stripeRefundId, amountCents: amount, reason: "admin_refund" },
    }),
    prisma.payment.update({
      where: { bookingId },
      data: { status: fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUND },
    }),
    prisma.bookingEvent.create({
      data: { bookingId, actorId: admin.id, type: "admin_refund", payload: { amountCents: amount, fullyRefunded } },
    }),
    adminActionLog(admin.id, "booking", bookingId, "refund", `${amount} cents`),
  ]);

  revalidatePath("/admin");
  return { ok: true };
}

// Верификация документа исполнителя: подтверждение лицензии (RECI/RGII и т.п.).
export async function verifyDocument(id: string): Promise<void> {
  const admin = await requireAdminScope("documents");
  const doc = await prisma.providerDocument.findUnique({ where: { id }, select: { providerId: true } });
  if (!doc) return;
  await prisma.$transaction([
    prisma.providerDocument.update({ where: { id }, data: { verifiedAt: new Date() } }),
    adminActionLog(admin.id, "document", id, "verify"),
  ]);
  revalidatePath("/admin");
  revalidatePath(`/providers/${doc.providerId}`);
}

// Снять подтверждение документа.
export async function unverifyDocument(id: string): Promise<void> {
  const admin = await requireAdminScope("documents");
  const doc = await prisma.providerDocument.findUnique({ where: { id }, select: { providerId: true } });
  if (!doc) return;
  await prisma.$transaction([
    prisma.providerDocument.update({ where: { id }, data: { verifiedAt: null } }),
    adminActionLog(admin.id, "document", id, "unverify"),
  ]);
  revalidatePath("/admin");
  revalidatePath(`/providers/${doc.providerId}`);
}

// Удалить документ (не прошёл проверку).
export async function deleteDocument(id: string): Promise<void> {
  const admin = await requireAdminScope("documents");
  const doc = await prisma.providerDocument.findUnique({ where: { id }, select: { providerId: true, url: true } });
  if (!doc) return;
  await prisma.$transaction([
    prisma.providerDocument.delete({ where: { id } }),
    adminActionLog(admin.id, "document", id, "delete"),
  ]);
  await removeImage(doc.url);
  revalidatePath("/admin");
  revalidatePath(`/providers/${doc.providerId}`);
}

export type DisputeOutcome = "full_refund" | "partial_refund" | "provider_paid";
export type ResolveResult = { ok: true } | { error: string };

// Арбитраж спора: окончательное решение поддержки (docs/domora-spec.md 6.1).
// - full_refund: заказчику полный возврат, исполнителю выплата не идёт.
// - partial_refund: заказчику возврат указанной суммы, исполнителю обычная выплата
//   (разницу берёт на себя площадка из своей комиссии).
// - provider_paid: возврата нет, исполнителю уходит выплата.
// Заказ закрывается, спор помечается RESOLVED, обе стороны получают уведомление.
export async function resolveDispute(
  disputeId: string,
  outcome: DisputeOutcome,
  amountEuros?: number,
): Promise<ResolveResult> {
  const admin = await requireAdminScope("disputes");
  const t = getAdminDict(await getLocale());

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { booking: { include: { payment: true } } },
  });
  if (!dispute?.booking || dispute.status === DisputeStatus.RESOLVED) return { error: t.errGeneric };
  const booking = dispute.booking;

  // Сумма частичного возврата в центах, ограничена итогом заказа.
  let refundCents = 0;
  if (outcome === "full_refund") {
    refundCents = booking.payment?.amountCents ?? booking.totalCents;
  } else if (outcome === "partial_refund") {
    refundCents = Math.round(Number(amountEuros) * 100);
    if (!Number.isFinite(refundCents) || refundCents <= 0) return { error: t.errRefund };
    refundCents = Math.min(refundCents, booking.payment?.amountCents ?? booking.totalCents);
  }

  try {
    // Возврат заказчику (если предусмотрен решением).
    if (refundCents > 0) await refundToClient(booking.id, refundCents, `arbitration_${outcome}`);

    const payProvider = outcome !== "full_refund";
    const canPay =
      payProvider &&
      (booking.payment?.status === PaymentStatus.CAPTURED ||
        booking.payment?.status === PaymentStatus.PARTIAL_REFUND);

    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          resolutionCode: outcome,
          resolutionCents: refundCents,
          arbiterId: admin.id,
        },
      }),
      // Если платим исполнителю - переводим заказ в COMPLETED и открываем окно
      // выплаты немедленно; иначе закрываем заказ сразу.
      prisma.booking.update({
        where: { id: booking.id },
        data: canPay
          ? { status: BookingStatus.COMPLETED, disputeWindowEndsAt: new Date() }
          : { status: BookingStatus.CLOSED },
      }),
      prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          actorId: admin.id,
          type: "dispute_resolved",
          payload: { outcome, refundCents },
        },
      }),
      adminActionLog(admin.id, "dispute", disputeId, `resolve_${outcome}`, `${refundCents} cents`),
    ]);

    // Выплату исполнителю проводим best-effort (processPayouts идемпотентен).
    if (canPay) await processPayouts().catch((e) => console.error("payout after arbitration failed", e));
  } catch (e) {
    console.error("resolveDispute failed", disputeId, e);
    return { error: t.errGeneric };
  }

  await notify(booking.clientId, "dispute", { bookingId: booking.id, resolved: true });
  await notify(booking.providerId, "dispute", { bookingId: booking.id, resolved: true });

  revalidatePath("/admin");
  revalidatePath("/bookings");
  revalidatePath("/pro/bookings");
  return { ok: true };
}

// --- Удаление пользователя (жёсткое): полностью, без следов. ---
// Удаляем аккаунт и все его данные из базы (каскад в purgeUsers) и из Supabase
// Auth, чтобы не осталось ни записи, ни возможности входа. Заморозка (freeze) -
// отдельное мягкое действие, см. setUserFrozen.
export async function deleteUser(userId: string): Promise<void> {
  const admin = await requireAdminScope("users");
  if (userId === admin.id) return; // себя не удаляем

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, roles: true } });
  if (!user || user.roles.includes(Role.ADMIN)) return; // других админов не трогаем

  // 1) Полное удаление из базы (брони, чат, отзывы, услуги, задачи и т.д.).
  await purgeUsers([userId]);

  // 2) Удаление из Supabase Auth по email (id в auth.users свой, ищем по почте).
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM auth.users WHERE lower(email) = $1 LIMIT 1`,
      user.email.toLowerCase(),
    );
    const authId = rows[0]?.id;
    if (authId) await getSupabaseAdmin().auth.admin.deleteUser(authId);
  } catch (e) {
    console.error("deleteUser: auth cleanup failed", userId, e);
  }

  // 3) Журнал действия администратора (targetId - без внешнего ключа на User).
  await adminActionLog(admin.id, "user", userId, "delete");

  revalidatePath("/admin");
  revalidatePath("/catalog");
}

// --- Удаление заказа (V1-модель без денег). ---
// Полный каскад: чистим ВСЕ зависимые записи в транзакции и отвязываем задачу,
// иначе внешние ключи (Quote, Transfer, Dispute, Payment из старого флоу)
// блокируют удаление и кнопка «молча» ничего не делает.
export async function deleteBooking(bookingId: string): Promise<void> {
  const admin = await requireAdminScope("bookings");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      payment: { select: { id: true } },
      transfer: { select: { id: true } },
      dispute: { select: { id: true } },
      quote: { select: { id: true } },
      thread: { select: { id: true } },
      task: { select: { id: true } },
    },
  });
  if (!booking) return;

  await prisma.$transaction(async (tx) => {
    // Отзывы, события, чат.
    await tx.review.deleteMany({ where: { bookingId } });
    await tx.bookingEvent.deleteMany({ where: { bookingId } });
    if (booking.thread) {
      await tx.message.deleteMany({ where: { threadId: booking.thread.id } });
      await tx.thread.delete({ where: { id: booking.thread.id } });
    }
    // Котировка.
    if (booking.quote) await tx.quote.delete({ where: { bookingId } });
    // Спор и его сообщения.
    if (booking.dispute) {
      await tx.disputeMessage.deleteMany({ where: { disputeId: booking.dispute.id } });
      await tx.dispute.delete({ where: { id: booking.dispute.id } });
    }
    // Платёжные записи (в V1 без оплат это остатки старого флоу Stripe).
    if (booking.transfer) await tx.transfer.delete({ where: { bookingId } });
    if (booking.payment) {
      await tx.refund.deleteMany({ where: { paymentId: booking.payment.id } });
      await tx.payment.delete({ where: { bookingId } });
    }
    // Задача возвращается в ленту (отвязываем бронь).
    if (booking.task) {
      await tx.task.update({ where: { id: booking.task.id }, data: { bookingId: null } });
    }
    await tx.booking.delete({ where: { id: bookingId } });
    await adminActionLog(admin.id, "booking", bookingId, "delete");
  });

  revalidatePath("/admin");
}

// --- Категории: создание и редактирование. ---
function parseUnit(raw: FormDataEntryValue | null): PriceUnit | null {
  const v = String(raw ?? "");
  return (Object.values(PriceUnit) as string[]).includes(v) ? (v as PriceUnit) : null;
}

export async function createCategory(formData: FormData): Promise<void> {
  const admin = await requireAdminScope("categories");

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const nameRu = String(formData.get("nameRu") ?? "").trim();
  const unit = parseUnit(formData.get("unitDefault"));
  if (!slug || !nameEn || !nameRu || !unit) return;

  const exists = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (exists) return; // slug занят

  await prisma.$transaction([
    prisma.category.create({ data: { slug, nameEn, nameRu, unitDefault: unit } }),
    adminActionLog(admin.id, "category", slug, "create"),
  ]);

  revalidateTag(CATEGORIES_TAG); // сбросить кэш списка категорий
  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/");
}

export async function updateCategory(id: string, formData: FormData): Promise<void> {
  const admin = await requireAdminScope("categories");

  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const nameRu = String(formData.get("nameRu") ?? "").trim();
  const unit = parseUnit(formData.get("unitDefault"));
  if (!nameEn || !nameRu || !unit) return;

  const cat = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!cat) return;

  await prisma.$transaction([
    prisma.category.update({ where: { id }, data: { nameEn, nameRu, unitDefault: unit } }),
    adminActionLog(admin.id, "category", id, "update"),
  ]);

  revalidateTag(CATEGORIES_TAG); // сбросить кэш списка категорий
  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/");
}

// Удаление категории. Услуги и задачи переносим в запасную категорию «Другое»
// (slug "other"), отвязывая подкатегории, затем удаляем подкатегории и саму
// категорию. Саму «Другое» удалить нельзя - это запасная категория.
export async function deleteCategory(id: string): Promise<void> {
  const admin = await requireAdminScope("categories");
  const cat = await prisma.category.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!cat || cat.slug === "other") return;
  const fallback = await prisma.category.findUnique({ where: { slug: "other" }, select: { id: true } });

  await prisma.$transaction([
    ...(fallback
      ? [
          prisma.listing.updateMany({ where: { categoryId: id }, data: { categoryId: fallback.id, subcategoryId: null } }),
          prisma.task.updateMany({ where: { categoryId: id }, data: { categoryId: fallback.id, subcategoryId: null } }),
        ]
      : []),
    prisma.subcategory.deleteMany({ where: { categoryId: id } }),
    prisma.category.delete({ where: { id } }),
    adminActionLog(admin.id, "category", id, "delete"),
  ]);

  revalidateTag(CATEGORIES_TAG); // сбросить кэш списка категорий
  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/");
}

// --- Жалобы: разбор помеченных (disputeFlag) отзывов. ---
// "delete" удаляет отзыв и пересчитывает рейтинг адресата; "dismiss" снимает флаг.
export async function resolveComplaint(reviewId: string, action: "delete" | "dismiss"): Promise<void> {
  const admin = await requireAdminScope("complaints");

  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, targetId: true } });
  if (!review) return;

  if (action === "delete") {
    await prisma.$transaction([
      prisma.review.delete({ where: { id: reviewId } }),
      adminActionLog(admin.id, "review", reviewId, "complaint_delete"),
    ]);
    await recomputeRating(review.targetId);
  } else {
    await prisma.$transaction([
      prisma.review.update({ where: { id: reviewId }, data: { disputeFlag: false } }),
      adminActionLog(admin.id, "review", reviewId, "complaint_dismiss"),
    ]);
  }

  revalidatePath("/admin");
  revalidatePath(`/providers/${review.targetId}`);
}

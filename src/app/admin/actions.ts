"use server";

// Действия админки. Каждое проверяет роль ADMIN и пишет запись в AdminAction
// в той же транзакции, что и само изменение (docs/domora-spec.md: аудит админа).
import { revalidatePath } from "next/cache";
import {
  BookingStatus,
  ListingStatus,
  PaymentStatus,
  PriceUnit,
  ProviderStatus,
  Role,
  UserStatus,
} from "@prisma/client";
import { DisputeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { removeImage } from "@/lib/storage";
import { requireAdminScope, adminActionLog } from "@/lib/admin";
import { getLocale } from "@/i18n/server";
import { getAdminDict } from "./i18n";
import { notify } from "@/lib/notify";
import { refundToClient } from "@/lib/cancellation";
import { processPayouts } from "@/lib/jobs";
import { recomputeRating } from "@/lib/reviews";

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

// --- Удаление пользователя (мягкое): обезличивание + бан. ---
// Реального удаления строки не делаем (на ней висят заказы/сообщения/отзывы) -
// вместо этого скрываем персональные данные и закрываем доступ.
export async function deleteUser(userId: string): Promise<void> {
  const admin = await requireAdminScope("users");
  if (userId === admin.id) return; // себя не удаляем

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.roles.includes(Role.ADMIN)) return; // других админов не трогаем

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        name: "Deleted user",
        email: `deleted+${userId}@domora.invalid`,
        phone: null,
        status: UserStatus.BANNED,
      },
    }),
    adminActionLog(admin.id, "user", userId, "delete"),
  ]);

  // Если это исполнитель - убираем его из каталога.
  const provider = await prisma.providerProfile.findUnique({ where: { userId }, select: { userId: true } });
  if (provider) {
    await prisma.providerProfile.update({ where: { userId }, data: { status: ProviderStatus.BANNED } });
  }

  revalidatePath("/admin");
  revalidatePath("/catalog");
}

// --- Удаление заказа (только без платежа: V1-модель без денег). ---
// Каскадно чистим зависимые записи в транзакции и отвязываем задачу.
export async function deleteBooking(bookingId: string): Promise<void> {
  const admin = await requireAdminScope("bookings");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, payment: { select: { id: true } }, thread: { select: { id: true } }, task: { select: { id: true } } },
  });
  if (!booking) return;
  // Безопасность: заказы с платежом не удаляем (это денежная история).
  if (booking.payment) return;

  await prisma.$transaction(async (tx) => {
    await tx.review.deleteMany({ where: { bookingId } });
    if (booking.thread) {
      await tx.message.deleteMany({ where: { threadId: booking.thread.id } });
      await tx.thread.delete({ where: { id: booking.thread.id } });
    }
    await tx.bookingEvent.deleteMany({ where: { bookingId } });
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

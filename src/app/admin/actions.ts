"use server";

// Действия админки. Каждое проверяет роль ADMIN и пишет запись в AdminAction
// в той же транзакции, что и само изменение (docs/domora-spec.md: аудит админа).
import { revalidatePath } from "next/cache";
import {
  BookingStatus,
  ListingStatus,
  PaymentStatus,
  ProviderStatus,
  UserStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAdmin, adminActionLog } from "@/lib/admin";
import { getLocale } from "@/i18n/server";
import { getAdminDict } from "./i18n";

// Одобрение услуги: MODERATION -> ACTIVE. Первое одобрение выводит профиль
// исполнителя в ACTIVE, после чего он и его услуги видны в каталоге.
export async function approveListing(listingId: string): Promise<void> {
  const admin = await requireAdmin();

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

  revalidatePath("/admin");
  revalidatePath("/catalog");
}

// Отклонение услуги с комментарием для исполнителя.
export async function rejectListing(listingId: string, reason: string): Promise<void> {
  const admin = await requireAdmin();
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

  revalidatePath("/admin");
}

// Заморозка и разблокировка пользователя (UserStatus ACTIVE <-> FROZEN).
export async function setUserFrozen(userId: string, frozen: boolean): Promise<void> {
  const admin = await requireAdmin();
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
  const admin = await requireAdmin();

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
  const admin = await requireAdmin();
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

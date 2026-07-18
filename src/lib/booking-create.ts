// Единое ядро создания брони - используется и серверным экшеном сайта, и REST
// API для мобильного приложения. Здесь вся валидация, создание/переиспользование
// черновика брони, купоны и холд на карте. Ошибки возвращаются кодами, чтобы
// каждый клиент сам показал текст на своём языке.
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcBooking, stripe } from "@/lib/stripe";
import { encrypt } from "@/lib/crypto";
import { slotTaken } from "@/lib/bookings";
import { isProviderAvailable } from "@/lib/availability";
import { genBookingRef } from "@/lib/booking-ref";
import { rateLimit } from "@/lib/rate-limit";
import { createOrUpdateBookingHold, markBookingRequested } from "@/lib/payments";
import { qtyConfig } from "@/lib/booking-units";
import { couponDiscount, findActiveCouponByCode, getCouponById, redeemCoupon } from "@/lib/coupons";

export type BookingRequestInput = {
  listingId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  qty: number;
  address: string;
  message?: string;
  couponCode?: string;
  draftBookingId?: string;
};

export type BookingErrorCode = "form" | "past" | "listing" | "self" | "slot" | "unavailable" | "rate" | "generic";
export type CreateHoldResult = { bookingId: string; clientSecret: string } | { error: BookingErrorCode };

// Создаёт (или переиспользует) черновик брони и холд на полную сумму.
// Дальше клиент подтверждает карту и вызывает finalizeBookingHold.
export async function createBookingHold(
  userId: string,
  email: string,
  locale: string,
  input: BookingRequestInput,
): Promise<CreateHoldResult> {
  // Ограничение частоты: не более 12 попыток за 10 минут с аккаунта.
  if (!rateLimit(`book:${userId}`, 12, 10 * 60 * 1000)) return { error: "rate" };

  const address = (input.address ?? "").trim();
  const message = (input.message ?? "").trim();
  const qty = Number(input.qty);

  if (!input.listingId || !input.date || !input.time || !address || !Number.isInteger(qty) || qty < 1) {
    return { error: "form" };
  }

  const dateStart = new Date(`${input.date}T${input.time}`);
  if (Number.isNaN(dateStart.getTime())) return { error: "form" };
  if (dateStart.getTime() <= Date.now()) return { error: "past" };

  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: { category: true, provider: { include: { user: { select: { isTest: true } } } } },
  });
  if (
    !listing ||
    listing.status !== "ACTIVE" ||
    listing.provider.status !== "ACTIVE" ||
    listing.provider.user.isTest ||
    listing.quoteFirst ||
    listing.unit === "FIXED_QUOTE" ||
    listing.priceCents <= 0
  ) {
    return { error: "listing" };
  }
  if (listing.providerId === userId) return { error: "self" };
  if (qty < qtyConfig(listing.unit).min) return { error: "form" };

  if (await slotTaken(listing.providerId, dateStart, input.draftBookingId)) return { error: "slot" };
  if (!(await isProviderAvailable(listing.providerId, dateStart))) return { error: "unavailable" };

  const money = calcBooking(
    listing.priceCents,
    qty,
    Number(listing.category.clientFeePct),
    Number(listing.category.providerFeePct),
  );

  try {
    const draft = input.draftBookingId
      ? await prisma.booking.findUnique({ where: { id: input.draftBookingId } })
      : null;

    // Купон: явный код приоритетнее; при повторной попытке берём привязанный к
    // черновику, чтобы сумма не менялась. Скидку финансирует площадка.
    let coupon: { id: string; pct: number } | null = null;
    if (input.couponCode) coupon = await findActiveCouponByCode(userId, input.couponCode.trim());
    else if (draft?.couponId) coupon = await getCouponById(draft.couponId);
    const discount = coupon ? couponDiscount(money.total, coupon.pct) : 0;
    const totalCents = Math.max(money.total - discount, 0);

    const bookingData = {
      clientId: userId,
      providerId: listing.providerId,
      listingId: listing.id,
      dateStart,
      qty,
      unit: listing.unit,
      priceCentsSnapshot: listing.priceCents,
      subtotalCents: money.subtotal,
      clientFeeCents: money.clientFee,
      providerFeeCents: money.providerFee,
      totalCents,
      couponId: coupon?.id ?? null,
      addressEncrypted: encrypt(address),
    };

    let bookingId: string;
    if (draft && draft.clientId === userId && draft.status === BookingStatus.DRAFT) {
      await prisma.booking.update({ where: { id: draft.id }, data: bookingData });
      bookingId = draft.id;
    } else {
      const booking = await prisma.booking.create({
        data: {
          ...bookingData,
          ref: genBookingRef(),
          status: BookingStatus.DRAFT,
          events: {
            create: { actorId: userId, type: "status_change", payload: { to: BookingStatus.DRAFT, reason: "awaiting_payment" } },
          },
          thread: {
            create: message
              ? { messages: { create: { authorId: userId, textOriginal: message, langOriginal: locale } } }
              : {},
          },
        },
      });
      bookingId = booking.id;
    }

    const { clientSecret } = await createOrUpdateBookingHold({ bookingId, totalCents, email });
    return { bookingId, clientSecret };
  } catch (e) {
    console.error("createBookingHold failed", e);
    return { error: "generic" };
  }
}

export type FinalizeResult = { ok: true } | { error: "pay" | "generic" };

// После подтверждения карты клиентом: проверяем холд в Stripe и переводим бронь
// в REQUESTED. Идемпотентно к вебхуку payment_intent.amount_capturable_updated.
export async function finalizeBookingHold(bookingId: string, userId: string): Promise<FinalizeResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
  if (!booking || booking.clientId !== userId || !booking.payment) return { error: "generic" };
  if (booking.status !== BookingStatus.DRAFT) return { ok: true }; // вебхук успел раньше

  try {
    const intent = await stripe.paymentIntents.retrieve(booking.payment.stripePaymentIntentId);
    if (intent.status !== "requires_capture") return { error: "pay" };
    await markBookingRequested(booking.id, userId);
    if (booking.couponId) await redeemCoupon(booking.couponId, booking.id);
    return { ok: true };
  } catch (e) {
    console.error("finalizeBookingHold failed", e);
    return { error: "generic" };
  }
}

"use server";

// Запрос брони с оплатой (docs/domora-spec.md, раздел 3.2):
// 1) createBookingRequest: проверка формы, бронь в статусе DRAFT, PaymentIntent
//    с capture_method=manual (холд на полную сумму) и Payment со статусом HOLD;
// 2) клиент подтверждает карту через Stripe Elements (confirmPayment, 3DS);
// 3) finalizeBookingPayment: проверка холда в Stripe и переход DRAFT -> REQUESTED.
//    Резервный путь тот же самый через вебхук payment_intent.amount_capturable_updated.
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { encrypt } from "@/lib/crypto";
import { calcBooking, stripe } from "@/lib/stripe";
import { createOrUpdateBookingHold, markBookingRequested } from "@/lib/payments";
import { qtyConfig } from "@/lib/booking-units";

export type BookingRequestInput = {
  listingId: string;
  date: string;
  time: string;
  qty: number;
  address: string;
  message: string;
  // Бронь предыдущей неудачной попытки оплаты: переиспользуем вместо новой.
  draftBookingId?: string;
};

export type BookingRequestResult =
  | { error: string }
  | { bookingId: string; clientSecret: string };

export async function createBookingRequest(input: BookingRequestInput): Promise<BookingRequestResult> {
  const locale = await getLocale();
  const t = getDict(locale);

  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");
  const user = await ensureDbUser(authUser, locale);

  const address = input.address.trim();
  const message = input.message.trim();
  const qty = Number(input.qty);

  if (!input.listingId || !input.date || !input.time || !address || !Number.isInteger(qty) || qty < 1) {
    return { error: t.errForm };
  }

  const dateStart = new Date(`${input.date}T${input.time}`);
  if (Number.isNaN(dateStart.getTime())) return { error: t.errForm };
  if (dateStart.getTime() <= Date.now()) return { error: t.errPast };

  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: { category: true, provider: true },
  });
  if (
    !listing ||
    listing.status !== "ACTIVE" ||
    listing.provider.status !== "ACTIVE" ||
    listing.quoteFirst ||
    listing.unit === "FIXED_QUOTE" ||
    listing.priceCents <= 0
  ) {
    return { error: t.errListing };
  }
  if (listing.providerId === user.id) return { error: t.errSelf };
  if (qty < qtyConfig(listing.unit).min) return { error: t.errForm };

  const money = calcBooking(
    listing.priceCents,
    qty,
    Number(listing.category.clientFeePct),
    Number(listing.category.providerFeePct),
  );

  const bookingData = {
    clientId: user.id,
    providerId: listing.providerId,
    listingId: listing.id,
    dateStart,
    qty,
    unit: listing.unit,
    priceCentsSnapshot: listing.priceCents,
    subtotalCents: money.subtotal,
    clientFeeCents: money.clientFee,
    providerFeeCents: money.providerFee,
    totalCents: money.total,
    addressEncrypted: encrypt(address),
  };

  try {
    let bookingId: string;

    const draft = input.draftBookingId
      ? await prisma.booking.findUnique({ where: { id: input.draftBookingId } })
      : null;

    if (draft && draft.clientId === user.id && draft.status === BookingStatus.DRAFT) {
      await prisma.booking.update({ where: { id: draft.id }, data: bookingData });
      bookingId = draft.id;
    } else {
      const booking = await prisma.booking.create({
        data: {
          ...bookingData,
          status: BookingStatus.DRAFT,
          events: {
            create: {
              actorId: user.id,
              type: "status_change",
              payload: { to: BookingStatus.DRAFT, reason: "awaiting_payment" },
            },
          },
          thread: {
            create: message
              ? { messages: { create: { authorId: user.id, textOriginal: message, langOriginal: locale } } }
              : {},
          },
        },
      });
      bookingId = booking.id;
    }

    const { clientSecret } = await createOrUpdateBookingHold({
      bookingId,
      totalCents: money.total,
      email: user.email,
    });
    return { bookingId, clientSecret };
  } catch (e) {
    console.error("createBookingRequest failed", e);
    return { error: t.errGeneric };
  }
}

export type FinalizeResult = { error?: string };

// После confirmPayment на клиенте: проверяем холд в Stripe и переводим бронь
// в REQUESTED. Если вебхук успел раньше, повторный переход не выполняется.
export async function finalizeBookingPayment(bookingId: string): Promise<FinalizeResult> {
  const locale = await getLocale();
  const t = getDict(locale);

  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");
  const user = await ensureDbUser(authUser, locale);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking || booking.clientId !== user.id || !booking.payment) return { error: t.errGeneric };
  if (booking.status !== BookingStatus.DRAFT) return {}; // уже REQUESTED (вебхук успел)

  try {
    const intent = await stripe.paymentIntents.retrieve(booking.payment.stripePaymentIntentId);
    if (intent.status !== "requires_capture") return { error: t.errPay };
    await markBookingRequested(booking.id, user.id);
    return {};
  } catch (e) {
    console.error("finalizeBookingPayment failed", e);
    return { error: t.errGeneric };
  }
}

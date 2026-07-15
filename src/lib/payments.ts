// Платежные операции флоу бронирования поверх ядра src/lib/stripe.ts.
// Схема по спецификации (docs/domora-spec.md, раздел 3.2): холд (manual capture)
// в момент запроса, capture при принятии, снятие холда при отказе или таймауте.
// Вебхук /api/stripe/webhook остается источником правды и дублирует переходы.
import { BookingStatus, PaymentStatus, type Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { ensureStripeWebhooks } from "@/lib/stripe-webhook-setup";
import { REQUEST_TTL_HOURS } from "@/lib/booking-units";
import { notify } from "@/lib/notify";

// Создает PaymentIntent холда для DRAFT-брони и запись Payment со статусом HOLD.
// При повторной отправке формы (например, банк отклонил первую карту) бронь и
// Payment переиспользуются: у существующего PaymentIntent обновляется сумма.
export async function createOrUpdateBookingHold(input: {
  bookingId: string;
  totalCents: number;
  email: string;
}): Promise<{ clientSecret: string }> {
  // Перед первым холдом убеждаемся, что вебхуки в Stripe существуют:
  // событие подтверждения холда должно прийти, даже если клиент закроет страницу.
  await ensureStripeWebhooks();

  const existing = await prisma.payment.findUnique({ where: { bookingId: input.bookingId } });

  if (existing) {
    let intent = await stripe.paymentIntents.retrieve(existing.stripePaymentIntentId);
    if (intent.status === "canceled") {
      // Старый intent отменен (например, бронь успела истечь): выпускаем новый.
      intent = await createHoldIntent(input);
    } else if (intent.amount !== input.totalCents) {
      intent = await stripe.paymentIntents.update(existing.stripePaymentIntentId, {
        amount: input.totalCents,
      });
    }
    await prisma.payment.update({
      where: { bookingId: input.bookingId },
      data: {
        stripePaymentIntentId: intent.id,
        amountCents: input.totalCents,
        status: PaymentStatus.HOLD,
      },
    });
    return { clientSecret: intent.client_secret! };
  }

  const intent = await createHoldIntent(input);
  await prisma.payment.create({
    data: {
      bookingId: input.bookingId,
      stripePaymentIntentId: intent.id,
      amountCents: input.totalCents,
      status: PaymentStatus.HOLD,
    },
  });
  return { clientSecret: intent.client_secret! };
}

async function createHoldIntent(input: { bookingId: string; totalCents: number; email: string }) {
  return stripe.paymentIntents.create({
    amount: input.totalCents,
    currency: "eur",
    capture_method: "manual",
    payment_method_types: ["card"],
    receipt_email: input.email,
    transfer_group: input.bookingId, // separate charges and transfers: связка с выплатой
    metadata: { bookingId: input.bookingId },
  });
}

// Перевод DRAFT -> REQUESTED после подтвержденного холда. Идемпотентно:
// вызывается и из server action после confirmPayment, и из вебхука
// payment_intent.amount_capturable_updated, кто успел первым.
export async function markBookingRequested(bookingId: string, actorId: string | null): Promise<boolean> {
  const updated = await prisma.booking.updateMany({
    where: { id: bookingId, status: BookingStatus.DRAFT },
    data: {
      status: BookingStatus.REQUESTED,
      requestExpiresAt: new Date(Date.now() + REQUEST_TTL_HOURS * 3600 * 1000),
    },
  });
  if (updated.count === 0) return false;

  await prisma.$transaction([
    // После неудачной первой попытки оплаты Payment мог стать FAILED.
    prisma.payment.updateMany({ where: { bookingId }, data: { status: PaymentStatus.HOLD } }),
    prisma.bookingEvent.create({
      data: { bookingId, actorId, type: "status_change", payload: { to: BookingStatus.REQUESTED } },
    }),
  ]);

  // Новый запрос: уведомляем исполнителя (один раз, только победитель гонки сюда дошёл).
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { providerId: true } });
  if (b) await notify(b.providerId, "new_request", { bookingId });
  return true;
}

// Списание холда при принятии заказа. Идемпотентно: повторный клик или ретрай
// с тем же ключом не спишет дважды, а уже списанный intent считается успехом.
export async function captureBookingPayment(bookingId: string, paymentIntentId: string): Promise<void> {
  try {
    await stripe.paymentIntents.capture(paymentIntentId, undefined, {
      idempotencyKey: `capture-${bookingId}`,
    });
  } catch (e) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId).catch(() => null);
    if (!intent || intent.status !== "succeeded") throw e;
  }
}

// Снятие холда: отмена PaymentIntent при отказе исполнителя или таймауте 72 часа.
// Payment помечается REFUNDED: холд снят, у клиента ничего не удержано
// (отдельного статуса CANCELED в схеме нет, а Stripe шлет charge.refunded).
export async function releaseBookingHold(payment: Payment | null): Promise<void> {
  if (!payment || payment.status === PaymentStatus.CAPTURED) return;
  try {
    await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
  } catch (e) {
    const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId).catch(() => null);
    if (!intent || intent.status !== "canceled") throw e;
  }
  await prisma.payment.update({
    where: { bookingId: payment.bookingId },
    data: { status: PaymentStatus.REFUNDED },
  });
}

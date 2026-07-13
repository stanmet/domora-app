// POST /api/stripe/webhook
// Вебхуки: единственный источник правды по деньгам.
// Обязательно проверяем подпись и обрабатываем идемпотентно.
// Endpoint рассчитан на классические snapshot-события (полный объект в data.object).
// Thin-события (payload style "thin", Accounts v2) не поддерживаются: для платежных
// объектов v1 (payment_intent, charge) их не существует. Настройка: docs/stripe-webhook-setup.md
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { markBookingRequested } from "@/lib/payments";
import type Stripe from "stripe";

// Событий ждем из двух destination в Stripe: "Your account" (платежные события
// платформы) и "Connected accounts" (account.updated исполнителей). У каждого
// destination свой подписывающий секрет, поэтому проверяем подпись по обоим.
function verifyEvent(raw: string, sig: string): Stripe.Event | null {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET];
  for (const secret of secrets) {
    if (!secret) continue;
    try {
      return stripe.webhooks.constructEvent(raw, sig, secret);
    } catch {
      // подпись не от этого destination, пробуем следующий секрет
    }
  }
  return null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  const event = sig ? verifyEvent(raw, sig) : null;
  if (!event) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  // Пришел thin-payload (v2): значит, в Stripe настроен destination не того типа.
  // Отвечаем 400, чтобы ошибка была видна в списке доставок в Stripe Workbench.
  if ((event as { object?: string }).object === "v2.core.event" || event.type?.startsWith("v2.")) {
    return NextResponse.json(
      { error: "snapshot_webhook_required", hint: "Create a snapshot event destination, see docs/stripe-webhook-setup.md" },
      { status: 400 },
    );
  }

  switch (event.type) {
    // Исполнитель прошел онбординг: включаем выплаты в профиле
    case "account.updated": {
      const acc = event.data.object as Stripe.Account;
      await prisma.providerProfile.updateMany({
        where: { stripeAccountId: acc.id },
        data: { payoutsEnabled: !!acc.payouts_enabled },
      });
      break;
    }

    // Холд подтвержден (карта прошла, включая 3DS): страховка на случай,
    // если клиент закрыл страницу до вызова finalizeBookingPayment.
    case "payment_intent.amount_capturable_updated": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.status === "requires_capture" && pi.metadata.bookingId) {
        await markBookingRequested(pi.metadata.bookingId, null);
      }
      break;
    }

    // Холд отклонен банком: бронь не создалась платежно
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingId = pi.metadata.bookingId;
      if (bookingId) {
        await prisma.booking.update({ where: { id: bookingId }, data: { status: "DRAFT" } });
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data: { status: "FAILED" },
        });
      }
      break;
    }

    // Возврат проведен
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) {
        const full = charge.amount_refunded >= charge.amount;
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: pi },
          data: { status: full ? "REFUNDED" : "PARTIAL_REFUND" },
        });
      }
      break;
    }

    // Чарджбек от банка клиента: замораживаем выплату, собираем доказательства
    case "charge.dispute.created": {
      const dis = event.data.object as Stripe.Dispute;
      const pi = typeof dis.payment_intent === "string" ? dis.payment_intent : dis.payment_intent?.id;
      if (pi) {
        const payment = await prisma.payment.findFirst({ where: { stripePaymentIntentId: pi } });
        if (payment) {
          await prisma.transfer.updateMany({
            where: { bookingId: payment.bookingId, status: "SCHEDULED" },
            data: { status: "FROZEN" },
          });
          // TODO: notifyAdmins("chargeback", payment.bookingId)
          // Доказательства для ответа: переписка, фото работ, booking_events с геометками.
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

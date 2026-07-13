// POST /api/stripe/webhook
// Вебхуки: единственный источник правды по деньгам. Обрабатываем идемпотентно.
//
// Endpoint'ы в Stripe приложение создает само через API (src/lib/stripe-webhook-setup.ts),
// поэтому секрета подписи в переменных окружения может не быть. Подлинность события
// проверяем надежнее подписи: перечитываем событие из Stripe API по его id и работаем
// только с перечитанной копией. Подделать такое нельзя: чужой или выдуманный id
// Stripe не вернет, а данные берутся не из присланного payload, а напрямую из Stripe.
//
// Если STRIPE_WEBHOOK_SECRET / STRIPE_CONNECT_WEBHOOK_SECRET заданы, сначала пробуем
// обычную проверку подписи: она не тратит запрос к API.
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { markBookingRequested } from "@/lib/payments";
import type Stripe from "stripe";

function verifyBySecret(raw: string, sig: string): Stripe.Event | null {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET];
  for (const secret of secrets) {
    if (!secret) continue;
    try {
      return stripe.webhooks.constructEvent(raw, sig, secret);
    } catch {
      // подпись не от этого endpoint'а, пробуем следующий секрет
    }
  }
  return null;
}

// Thin-события (payload style "thin", Accounts v2) шлет destination, созданный
// вручную в новом формате дашборда. Все нужные нам события приходят в snapshot-
// формате на endpoint'ы, созданные приложением, поэтому thin просто подтверждаем
// и игнорируем, чтобы Stripe не копил ошибки доставки.
function isThinEvent(payload: { object?: unknown; type?: unknown }): boolean {
  return payload.object === "v2.core.event" || (typeof payload.type === "string" && payload.type.startsWith("v2."));
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event = sig ? verifyBySecret(raw, sig) : null;

  if (!event) {
    let payload: { id?: unknown; object?: unknown; type?: unknown; account?: unknown };
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "bad_payload" }, { status: 400 });
    }

    if (isThinEvent(payload)) {
      return NextResponse.json({ received: true, ignored: "thin_event" });
    }
    if (typeof payload.id !== "string" || !payload.id.startsWith("evt_")) {
      return NextResponse.json({ error: "bad_payload" }, { status: 400 });
    }

    try {
      // События connected-аккаунтов (account.updated исполнителя) лежат в самом
      // connected-аккаунте: перечитываем их с заголовком Stripe-Account.
      event = await stripe.events.retrieve(
        payload.id,
        undefined,
        typeof payload.account === "string" ? { stripeAccount: payload.account } : undefined,
      );
    } catch {
      return NextResponse.json({ error: "unknown_event" }, { status: 400 });
    }
  } else if (isThinEvent(event as { object?: unknown; type?: unknown })) {
    return NextResponse.json({ received: true, ignored: "thin_event" });
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

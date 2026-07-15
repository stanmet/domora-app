// Фоновые задачи денежного цикла. Запускаются из /api/cron (Vercel Cron) и
// дополнительно "лениво" при заходе исполнителя в свои заказы и при подтверждении
// клиентом. Все операции идемпотентны, чтобы повтор не навредил.
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { expireOverdueRequests } from "@/lib/bookings";

// 1. Запросы без ответа 72 часа: снять холд, статус EXPIRED.
export async function expireStaleRequests(): Promise<void> {
  await expireOverdueRequests({});
}

// 2. Выплаты исполнителям: завершённые заказы, у которых прошло окно спора,
// переводим исполнителю (separate charges and transfers) и закрываем.
// Идемпотентно: transfer создаётся один раз, Stripe-перевод с ключом bookingId.
// Если у исполнителя ещё не подключён Stripe (нет счёта) — оставляем заказ
// COMPLETED с запланированным переводом; выплатим на следующем проходе.
export async function processPayouts(): Promise<void> {
  const due = await prisma.booking.findMany({
    where: { status: "COMPLETED", disputeWindowEndsAt: { lte: new Date() } },
    include: { provider: true, payment: true, transfer: true },
  });

  for (const b of due) {
    try {
      if (b.transfer?.status === "DONE") continue;

      // Сумма исполнителю: подытог за вычетом комиссии площадки.
      const amount = b.subtotalCents - b.providerFeeCents;

      // Гарантируем запись Transfer (планирование выплаты).
      let transfer = b.transfer;
      if (!transfer) {
        transfer = await prisma.transfer.create({
          data: { bookingId: b.id, amountCents: amount, scheduledAt: new Date(), status: "SCHEDULED" },
        });
      }

      // Нет счёта исполнителя или платежа — выплату отложим до следующего прохода.
      const acct = b.provider.stripeAccountId;
      if (!acct || !b.payment) continue;

      const tr = await stripe.transfers.create(
        {
          amount: transfer.amountCents,
          currency: "eur",
          destination: acct,
          transfer_group: b.id,
          metadata: { bookingId: b.id },
        },
        { idempotencyKey: `transfer-${b.id}` },
      );

      await prisma.$transaction([
        prisma.transfer.update({
          where: { id: transfer.id },
          data: { status: "DONE", executedAt: new Date(), stripeTransferId: tr.id },
        }),
        prisma.booking.update({ where: { id: b.id }, data: { status: "CLOSED" } }),
        prisma.bookingEvent.create({
          data: { bookingId: b.id, actorId: null, type: "status_change", payload: { to: "CLOSED", reason: "payout_executed" } },
        }),
      ]);
    } catch (e) {
      console.error("payout failed", b.id, e);
    }
  }
}

// Фоновые задачи (BullMQ / cron). Запускать каждые 5 минут.
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { expireOverdueRequests } from "@/lib/bookings";

// 1. Запросы без ответа 72 часа: снять холд, статус EXPIRED.
// Та же логика, что и при ленивом истечении на страницах заказов.
export async function expireStaleRequests() {
  await expireOverdueRequests({});
  // TODO: предложить клиенту похожих исполнителей
}

// 2. Завершенные без жалобы 48 часов: закрыть окно спора, создать transfer через 24 часа
export async function scheduleTransfers() {
  const done = await prisma.booking.findMany({
    where: { status: "COMPLETED", disputeWindowEndsAt: { lt: new Date() }, transfer: null },
    include: { provider: true },
  });
  for (const b of done) {
    await prisma.transfer.create({
      data: {
        bookingId: b.id,
        amountCents: b.subtotalCents - b.providerFeeCents,
        scheduledAt: new Date(),
        status: "SCHEDULED",
      },
    });
  }
}

// 3. Исполнить запланированные transfers (если нет спора)
export async function executeTransfers() {
  const ready = await prisma.transfer.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lt: new Date() } },
    include: { booking: { include: { provider: true, payment: true } } },
  });
  for (const t of ready) {
    const acct = t.booking.provider.stripeAccountId;
    if (!acct || !t.booking.payment) continue;
    const tr = await stripe.transfers.create(
      {
        amount: t.amountCents,
        currency: "eur",
        destination: acct,
        source_transaction: undefined, // при separate charges: без привязки, баланс платформы
        metadata: { bookingId: t.bookingId },
      },
      { idempotencyKey: `transfer-${t.bookingId}` },
    );
    await prisma.$transaction([
      prisma.transfer.update({
        where: { id: t.id },
        data: { status: "DONE", executedAt: new Date(), stripeTransferId: tr.id },
      }),
      prisma.booking.update({ where: { id: t.bookingId }, data: { status: "CLOSED" } }),
    ]);
  }
}

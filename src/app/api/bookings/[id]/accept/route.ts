// POST /api/bookings/:id/accept
// Исполнитель принимает заказ: capture холда. Transfer планируется
// на completed + 24h отдельным воркером, здесь только списание.
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(req);
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id },
    include: { payment: true },
  });

  if (booking.providerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (booking.status !== "REQUESTED") return NextResponse.json({ error: "invalid_status" }, { status: 409 });
  if (!booking.payment) return NextResponse.json({ error: "no_payment" }, { status: 409 });

  // Списание. Идемпотентность на случай повторного клика.
  await stripe.paymentIntents.capture(booking.payment.stripePaymentIntentId, undefined, {
    idempotencyKey: `capture-${booking.id}`,
  });

  await prisma.$transaction([
    prisma.booking.update({ where: { id: booking.id }, data: { status: "ACCEPTED" } }),
    prisma.payment.update({
      where: { bookingId: booking.id },
      data: { status: "CAPTURED", capturedAt: new Date() },
    }),
    prisma.bookingEvent.create({
      data: { bookingId: booking.id, actorId: user.id, type: "status_change", payload: { to: "ACCEPTED" } },
    }),
  ]);

  // Обмен адресом и прокси-телефонами открывается с этого момента.
  // TODO: notify(client, "booking_accepted"), createProxyNumbers(booking)
  return NextResponse.json({ ok: true });
}

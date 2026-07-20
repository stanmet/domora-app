// POST /api/bookings/:id/accept
// Исполнитель принимает заказ: capture холда. Transfer планируется
// на completed + 24h отдельным воркером, здесь только списание.
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Платежи в V1 отключены: денежный роут закрыт, если Stripe не настроен.
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "payments_disabled" }, { status: 410 });
  const { id } = await params;
  let user;
  try {
    user = await requireUser(req);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
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
  await notify(booking.clientId, "accepted", { bookingId: booking.id });
  return NextResponse.json({ ok: true });
}

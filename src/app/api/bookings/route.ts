// POST /api/bookings
// Создает бронь в статусе REQUESTED и холд (manual capture) на карте клиента.
// Деньги НЕ списываются до подтверждения исполнителем.
import { NextResponse } from "next/server";
import { stripe, calcBooking } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { genBookingRef } from "@/lib/booking-ref";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const body = await req.json(); // { listingId, dateStart, qty, address, accessNote, paymentMethodId }

  const listing = await prisma.listing.findUniqueOrThrow({
    where: { id: body.listingId },
    include: { category: true, provider: { include: { user: { select: { isTest: true } } } } },
  });
  // Тестовую услугу нельзя забронировать даже прямым запросом к API.
  if (listing.status !== "ACTIVE" || listing.provider.status !== "ACTIVE" || listing.provider.user.isTest) {
    return NextResponse.json({ error: "listing_unavailable" }, { status: 409 });
  }

  const money = calcBooking(
    listing.priceCents,
    body.qty,
    Number(listing.category.clientFeePct),
    Number(listing.category.providerFeePct),
  );

  const booking = await prisma.booking.create({
    data: {
      clientId: user.id,
      providerId: listing.providerId,
      listingId: listing.id,
      ref: genBookingRef(),
      status: "REQUESTED",
      dateStart: new Date(body.dateStart),
      qty: body.qty,
      unit: listing.unit,
      priceCentsSnapshot: listing.priceCents,
      subtotalCents: money.subtotal,
      clientFeeCents: money.clientFee,
      providerFeeCents: money.providerFee,
      totalCents: money.total,
      addressEncrypted: body.address ? encrypt(body.address) : null,
      accessNoteEncrypted: body.accessNote ? encrypt(body.accessNote) : null,
      requestExpiresAt: new Date(Date.now() + 72 * 3600 * 1000),
      thread: { create: {} },
      events: { create: { actorId: user.id, type: "status_change", payload: { to: "REQUESTED" } } },
    },
  });

  // Холд: capture_method manual. Живет до 7 дней, наш таймаут 72 часа.
  const intent = await stripe.paymentIntents.create({
    amount: money.total,
    currency: "eur",
    customer: user.stripeCustomerId ?? undefined,
    payment_method: body.paymentMethodId,
    capture_method: "manual",
    confirm: true,
    metadata: { bookingId: booking.id },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      stripePaymentIntentId: intent.id,
      amountCents: money.total,
      status: "HOLD",
    },
  });

  // TODO: notify(provider, "new_request", booking)
  return NextResponse.json({ bookingId: booking.id, clientSecret: intent.client_secret });
}

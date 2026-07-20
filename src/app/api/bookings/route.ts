// POST /api/bookings - создание брони для мобильного приложения.
// Использует ТО ЖЕ ядро, что и сайт (src/lib/booking-create.ts): та же валидация,
// холд на карте и черновик брони. Возвращает { bookingId, clientSecret };
// клиент подтверждает карту через Stripe SDK и вызывает /api/bookings/:id/finalize.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createBookingHold, type BookingErrorCode } from "@/lib/booking-create";

const HTTP_STATUS: Record<BookingErrorCode, number> = {
  form: 400,
  past: 400,
  listing: 409,
  self: 409,
  slot: 409,
  unavailable: 409,
  rate: 429,
  generic: 500,
};

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "payments_disabled" }, { status: 410 });
  let user;
  try {
    user = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null); // { listingId, date, time, qty, address, message?, couponCode?, draftBookingId? }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "form" }, { status: 400 });
  }

  const locale = (req.headers.get("accept-language") ?? "en").slice(0, 2);
  const res = await createBookingHold(user.id, user.email, locale, {
    listingId: String(body.listingId ?? ""),
    date: String(body.date ?? ""),
    time: String(body.time ?? ""),
    qty: Number(body.qty),
    address: String(body.address ?? ""),
    message: body.message ? String(body.message) : undefined,
    couponCode: body.couponCode ? String(body.couponCode) : undefined,
    draftBookingId: body.draftBookingId ? String(body.draftBookingId) : undefined,
  });

  if ("error" in res) return NextResponse.json({ error: res.error }, { status: HTTP_STATUS[res.error] });
  return NextResponse.json(res);
}

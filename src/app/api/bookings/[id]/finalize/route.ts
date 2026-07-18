// POST /api/bookings/:id/finalize - подтверждение холда после оплаты картой
// в мобильном приложении. То же ядро, что и на сайте (finalizeBookingHold):
// проверяет холд в Stripe и переводит бронь в REQUESTED.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { finalizeBookingHold } from "@/lib/booking-create";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const res = await finalizeBookingHold(id, user.id);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.error === "pay" ? 402 : 500 });
  return NextResponse.json({ ok: true });
}

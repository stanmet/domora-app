// Купоны-скидки заказчику. Выдаются, например, при отмене исполнителем
// (10% на следующий заказ за счёт платформы, docs/domora-spec.md 4.2).
import { prisma } from "@/lib/prisma";

const COUPON_TTL_DAYS = 90;

function genCode(): string {
  return "DM-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function issueCoupon(
  clientId: string,
  pct: number,
  reason: string,
  sourceBookingId?: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + COUPON_TTL_DAYS * 24 * 3600 * 1000);
  try {
    await prisma.coupon.create({
      data: { code: genCode(), clientId, pct, reason, sourceBookingId: sourceBookingId ?? null, expiresAt },
    });
  } catch (e) {
    console.error("issueCoupon failed", clientId, e);
  }
}

// Самый выгодный активный купон клиента (не просроченный).
export async function getActiveCoupon(
  clientId: string,
): Promise<{ id: string; code: string; pct: number } | null> {
  try {
    const c = await prisma.coupon.findFirst({
      where: { clientId, status: "active", expiresAt: { gt: new Date() } },
      orderBy: { pct: "desc" },
      select: { id: true, code: true, pct: true },
    });
    return c;
  } catch {
    return null;
  }
}

// Активный купон клиента по коду (для применения на оформлении).
export async function findActiveCouponByCode(
  clientId: string,
  code: string,
): Promise<{ id: string; pct: number } | null> {
  try {
    const c = await prisma.coupon.findFirst({
      where: { clientId, code, status: "active", expiresAt: { gt: new Date() } },
      select: { id: true, pct: true },
    });
    return c;
  } catch {
    return null;
  }
}

export async function getCouponById(id: string): Promise<{ id: string; pct: number; status: string } | null> {
  try {
    return await prisma.coupon.findUnique({ where: { id }, select: { id: true, pct: true, status: true } });
  } catch {
    return null;
  }
}

// Пометить купон использованным (после успешной оплаты брони).
export async function redeemCoupon(couponId: string, bookingId: string): Promise<void> {
  try {
    await prisma.coupon.updateMany({
      where: { id: couponId, status: "active" },
      data: { status: "used", usedBookingId: bookingId },
    });
  } catch (e) {
    console.error("redeemCoupon failed", couponId, e);
  }
}

// Размер скидки в центах от суммы.
export function couponDiscount(totalCents: number, pct: number): number {
  return Math.round((totalCents * pct) / 100);
}

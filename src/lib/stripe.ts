import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Единый расчет денег брони. Все в центах.
export function calcBooking(priceCents: number, qty: number, clientFeePct: number, providerFeePct: number) {
  const subtotal = priceCents * qty;
  const clientFee = Math.round((subtotal * clientFeePct) / 100);
  const providerFee = Math.round((subtotal * providerFeePct) / 100);
  const total = subtotal + clientFee; // платит клиент
  const providerNet = subtotal - providerFee; // получит исполнитель
  return { subtotal, clientFee, providerFee, total, providerNet };
}

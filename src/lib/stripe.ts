import Stripe from "stripe";

// Клиент Stripe создается при первом реальном обращении, а не при импорте файла.
// Иначе next build падает на этапе сбора страниц, когда STRIPE_SECRET_KEY
// не задан в окружении сборки (например, на Vercel до настройки переменных).
let client: Stripe | undefined;

function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set. Add it in .env or in Vercel project settings.");
    }
    client = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return client;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const value = Reflect.get(getStripe(), prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
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

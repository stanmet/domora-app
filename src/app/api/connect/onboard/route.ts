// POST /api/connect/onboard
// Создает (при необходимости) Stripe Connect Express аккаунт исполнителя
// и возвращает ссылку онбординга. Stripe сам делает KYC и банковские реквизиты.
// После онбординга Stripe шлет account.updated, вебхук включит payoutsEnabled;
// страница /pro?onboarded=1 дополнительно сверяет статус сразу после возврата.
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { ensureStripeWebhooks } from "@/lib/stripe-webhook-setup";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser(req); // Bearer-токен или cookie-сессия Supabase
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  if (!user.roles.includes(Role.PROVIDER)) {
    return NextResponse.json({ error: "no_provider_profile" }, { status: 400 });
  }

  // Профиль исполнителя появляется при первом шаге онбординга; полное
  // заполнение (город, описание, услуги) идет следующими шагами чеклиста.
  let profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.providerProfile.create({
      data: { userId: user.id, displayName: user.name, city: user.city ?? "Dublin" },
    });
  }

  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "IE",
      email: user.email,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      metadata: { userId: user.id },
    });
    accountId = account.id;
    await prisma.providerProfile.update({
      where: { userId: user.id },
      data: { stripeAccountId: accountId },
    });
  }

  const origin = process.env.APP_URL || new URL(req.url).origin;
  // Вебхук account.updated должен существовать до онбординга, иначе
  // не узнаем, что исполнителю можно включить выплаты.
  await ensureStripeWebhooks(origin);

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/pro?stripe_refresh=1`,
    return_url: `${origin}/pro?onboarded=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}

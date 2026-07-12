// POST /api/connect/onboard
// Создает (при необходимости) Stripe Connect Express аккаунт исполнителя
// и возвращает ссылку онбординга. Stripe сам делает KYC и банковские реквизиты.
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await requireUser(req); // ваш auth-слой (NextAuth / Supabase Auth)
  let profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "no_provider_profile" }, { status: 400 });

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

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.APP_URL}/pro/payouts?refresh=1`,
    return_url: `${process.env.APP_URL}/pro/payouts?onboarded=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}

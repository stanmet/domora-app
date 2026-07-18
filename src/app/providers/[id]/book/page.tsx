// Страница запроса брони у исполнителя: только для вошедших пользователей.
// Услуги с ценой по смете (quote-first) здесь не бронируются, они пойдут
// через сметы в следующих спринтах.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getActiveCoupon } from "@/lib/coupons";
import { isDemoMode } from "@/lib/test-users/bots";
import BookingForm, { type BookableListing } from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ listing?: string }>;
}) {
  const { id } = await params;
  const { listing: preselected } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);

  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/providers/${id}/book`);
  const user = await ensureDbUser(authUser, locale);
  const coupon = await getActiveCoupon(user.id);

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: id },
    include: {
      user: { select: { isTest: true } },
      listings: {
        where: { status: "ACTIVE", quoteFirst: false, unit: { not: "FIXED_QUOTE" }, priceCents: { gt: 0 } },
        orderBy: { priceCents: "asc" },
        include: { category: { select: { clientFeePct: true } } },
      },
    },
  });
  if (!provider || provider.status !== "ACTIVE") notFound();

  // Демо-режим + тестовый исполнитель: бронь симулируется (без оплаты картой).
  const simulated = provider.user.isTest && (await isDemoMode());

  const listings: BookableListing[] = provider.listings.map((l) => ({
    id: l.id,
    title: l.title,
    priceCents: l.priceCents,
    unit: l.unit,
    clientFeePct: Number(l.category.clientFeePct),
  }));

  // Доступность исполнителя для формы: расписание + ближайшие заблокированные дни.
  const todayKey = new Date().toISOString().slice(0, 10);
  const timeOff = await prisma.timeOff.findMany({
    where: { providerId: id, date: { gte: new Date(`${todayKey}T00:00:00.000Z`) } },
    select: { date: true },
  });
  const avail = {
    workDays: provider.workDays,
    workStartMin: provider.workStartMin,
    workEndMin: provider.workEndMin,
    blockedDays: timeOff.map((o) => o.date.toISOString().slice(0, 10)),
  };

  return (
    <main className="wrap bform">
      <Link href={`/providers/${id}`} className="back">
        <ArrowLeft size={14} /> {t.back}
      </Link>
      <h1>{t.request}</h1>
      <p className="sub">
        {t.bWith} <b style={{ color: "var(--ink)" }}>{provider.displayName}</b>
      </p>
      {listings.length === 0 ? (
        <div className="empty">{t.errListing}</div>
      ) : (
        <BookingForm
          listings={listings}
          defaultListingId={listings.some((l) => l.id === preselected) ? (preselected as string) : listings[0].id}
          coupon={coupon ? { code: coupon.code, pct: coupon.pct } : null}
          avail={avail}
          simulated={simulated}
          t={t}
          locale={locale}
        />
      )}
    </main>
  );
}

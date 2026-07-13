// Страница запроса брони у исполнителя: только для вошедших пользователей.
// Услуги с ценой по смете (quote-first) здесь не бронируются, они пойдут
// через сметы в следующих спринтах.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
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

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: id },
    include: {
      listings: {
        where: { status: "ACTIVE", quoteFirst: false, unit: { not: "FIXED_QUOTE" }, priceCents: { gt: 0 } },
        orderBy: { priceCents: "asc" },
        include: { category: { select: { clientFeePct: true } } },
      },
    },
  });
  if (!provider || provider.status !== "ACTIVE") notFound();

  const listings: BookableListing[] = provider.listings.map((l) => ({
    id: l.id,
    title: l.title,
    priceCents: l.priceCents,
    unit: l.unit,
    clientFeePct: Number(l.category.clientFeePct),
  }));

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
          t={t}
          locale={locale}
        />
      )}
    </main>
  );
}

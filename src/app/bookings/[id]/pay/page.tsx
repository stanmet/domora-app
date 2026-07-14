// Оплата брони по выбранному отклику. Доступна только клиенту-владельцу,
// пока бронь в статусе DRAFT. Уже оплаченная бронь ведёт в список заказов.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import TaskCheckout from "./TaskCheckout";

export const dynamic = "force-dynamic";

export default async function PayBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getDict(locale);

  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/bookings/${id}/pay`);
  const user = await ensureDbUser(authUser, locale);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      provider: { select: { displayName: true } },
      task: { select: { title: true } },
      listing: { select: { title: true } },
    },
  });
  if (!booking || booking.clientId !== user.id) notFound();
  // Бронь уже оплачена (или дальше по флоу): показывать оплату незачем.
  if (booking.status !== "DRAFT") redirect("/bookings");

  const title = booking.task?.title ?? booking.listing.title;

  return (
    <main className="wrap bform">
      <Link href="/tasks/mine" className="back">
        <ArrowLeft size={14} /> {t.back}
      </Link>
      <h1>{t.payTitle}</h1>
      <p className="sub">
        {t.bWith} <b style={{ color: "var(--ink)" }}>{booking.provider.displayName}</b>
      </p>
      <TaskCheckout
        bookingId={booking.id}
        title={title}
        subtotalCents={booking.subtotalCents}
        clientFeeCents={booking.clientFeeCents}
        totalCents={booking.totalCents}
        t={t}
        locale={locale}
      />
    </main>
  );
}

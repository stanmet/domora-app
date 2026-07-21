// Инвойс (накладная) по брони: доступен клиенту и исполнителю после подтверждения
// заказа. Печатная страница с реквизитами, услугой, суммой, датой и номером.
// Domora - посредник; исполнитель сам отвечает за свои налоги (см. примечание).
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict, unitLabel } from "@/i18n/dictionaries";
import { dateOnly, eur } from "@/lib/format";
import { bookingRef } from "@/lib/booking-ref";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const INVOICEABLE = new Set(["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLOSED", "DISPUTED"]);

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/bookings/${id}/invoice`);
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      listing: { select: { title: true } },
      provider: { select: { displayName: true, city: true } },
      client: { select: { name: true } },
    },
  });
  if (!booking) notFound();
  // Доступ только участникам брони.
  if (booking.clientId !== user.id && booking.providerId !== user.id) notFound();

  if (!INVOICEABLE.has(booking.status)) {
    return (
      <main className="wrap sec" style={{ maxWidth: 640 }}>
        <Link href="/bookings" className="back">
          <ArrowLeft size={14} /> {t.myBookings}
        </Link>
        <h1 className="page">{t.invoiceTitle}</h1>
        <div className="empty" style={{ textAlign: "left" }}>{t.invoiceNA}</div>
      </main>
    );
  }

  const number = bookingRef(booking);

  return (
    <main className="wrap sec" style={{ maxWidth: 720 }}>
      <div
        className="no-print"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}
      >
        <Link href="/bookings" className="back" style={{ margin: 0 }}>
          <ArrowLeft size={14} /> {t.myBookings}
        </Link>
        <PrintButton label={t.invoicePrint} />
      </div>

      <div className="invoice">
        <div className="inv-top">
          <span className="logo" style={{ fontSize: 22 }}>
            DOMO<span>RA</span>
          </span>
          <div className="inv-meta">
            <div>
              <b>{t.invoiceNo}</b> {number}
            </div>
            <div>
              <b>{t.dateL}:</b> {dateOnly(booking.createdAt, locale)}
            </div>
          </div>
        </div>

        <div className="inv-parties">
          <div>
            <span className="inv-lbl">{t.invoiceFrom}</span>
            <b>{booking.provider.displayName}</b>
            <span>{booking.provider.city}</span>
          </div>
          <div>
            <span className="inv-lbl">{t.invoiceTo}</span>
            <b>{booking.client.name}</b>
          </div>
        </div>

        <table className="inv-table">
          <tbody>
            <tr>
              <td>
                <b>{booking.listing.title}</b>
                <span className="inv-sub">
                  {dateOnly(booking.dateStart, locale)} · {booking.qty} × {unitLabel(t, booking.unit)} × {eur(booking.priceCentsSnapshot, locale)}
                </span>
              </td>
              <td className="num">{eur(booking.subtotalCents, locale)}</td>
            </tr>
          </tbody>
        </table>

        <div className="inv-totals">
          <div className="row">
            <span>{t.sumService}</span>
            <span>{eur(booking.subtotalCents, locale)}</span>
          </div>
          {/* Комиссии в V1 нет: строку показываем только если сбор ненулевой. */}
          {booking.clientFeeCents > 0 && (
            <div className="row">
              <span>{t.sumFee}</span>
              <span>{eur(booking.clientFeeCents, locale)}</span>
            </div>
          )}
          <div className="row total">
            <span>{t.sumTotal}</span>
            <span>{eur(booking.totalCents, locale)}</span>
          </div>
        </div>

        <p className="inv-note">{t.invoiceNote}</p>
        <p className="inv-foot">{t.footerLeft}</p>
      </div>
    </main>
  );
}

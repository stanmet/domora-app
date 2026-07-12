// Раздел "Заказы" кабинета исполнителя: новые запросы с кнопками
// Принять и Отклонить, подтвержденные заказы и история.
// Разметка и стили из prototypes/HostDashboard.jsx (tab "bookings").
// Точный адрес клиента расшифровывается только после принятия заказа.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Calendar, Check, Clock, CreditCard, Lock, MapPin, ShieldCheck, Users } from "lucide-react";
import { BookingStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict, statusLabel, unitLabel, type Dict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { dateTime, eur } from "@/lib/format";
import { decrypt } from "@/lib/crypto";
import { expireOverdueRequests } from "@/lib/bookings";
import { statusPillClass } from "@/lib/booking-units";
import { acceptBooking, declineBooking } from "./actions";

export const dynamic = "force-dynamic";

// Адрес виден исполнителю только после принятия заказа (спецификация, раздел 5).
const ADDRESS_VISIBLE: BookingStatus[] = [
  BookingStatus.ACCEPTED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.DISPUTED,
  BookingStatus.CLOSED,
];

function safeDecrypt(payload: string | null): string | null {
  if (!payload) return null;
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}

type BookingWithRefs = Awaited<ReturnType<typeof loadBookings>>[number];

function loadBookings(providerId: string) {
  return prisma.booking.findMany({
    where: { providerId },
    orderBy: { dateStart: "asc" },
    include: {
      listing: { select: { title: true } },
      client: { select: { name: true } },
      thread: {
        select: { messages: { orderBy: { createdAt: "asc" }, take: 1, select: { textOriginal: true } } },
      },
    },
  });
}

function BookingCard({ b, t, locale }: { b: BookingWithRefs; t: Dict; locale: Locale }) {
  const isRequest = b.status === BookingStatus.REQUESTED;
  const address = ADDRESS_VISIBLE.includes(b.status) ? safeDecrypt(b.addressEncrypted) : null;
  const clientMessage = b.thread?.messages[0]?.textOriginal;

  return (
    <div className={"bk" + (isRequest ? " req" : "")}>
      <div className="bkrow">
        <div>
          <h4>{b.client.name}</h4>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{b.listing.title}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="amt">{eur(b.totalCents, locale)}</div>
          <span className={"pill " + statusPillClass(b.status)}>{statusLabel(t, b.status)}</span>
        </div>
      </div>
      <div className="meta">
        <span>
          <Calendar size={13} /> {dateTime(b.dateStart, locale)}
        </span>
        <span>
          <Users size={13} /> {b.qty} × {unitLabel(t, b.unit)}
        </span>
        <span>
          <CreditCard size={13} /> {eur(b.totalCents, locale)}
        </span>
        {address ? (
          <span>
            <MapPin size={13} /> {address}
          </span>
        ) : (
          isRequest && (
            <span>
              <Lock size={13} /> {t.addrAfterAccept}
            </span>
          )
        )}
      </div>
      {isRequest && clientMessage && (
        <div className="bkmsg">
          <b>{t.clientMsgL}</b>
          {clientMessage}
        </div>
      )}
      {isRequest && b.requestExpiresAt && (
        <div className="meta" style={{ margin: "0 0 10px" }}>
          <span>
            <Clock size={13} /> {t.respondBy} {dateTime(b.requestExpiresAt, locale)}
          </span>
        </div>
      )}
      {isRequest && (
        <div className="bkbtns">
          <form action={acceptBooking.bind(null, b.id)}>
            <button className="btn btn-green btn-sm">
              <Check size={14} /> {t.accept}
            </button>
          </form>
          <form action={declineBooking.bind(null, b.id)}>
            <button className="btn btn-red btn-sm">{t.decline}</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function ProBookingsPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/bookings");

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");

  await expireOverdueRequests({ providerId: user.id });
  const bookings = await loadBookings(user.id);

  const requests = bookings.filter((b) => b.status === BookingStatus.REQUESTED);
  const confirmed = bookings.filter(
    (b) => b.status === BookingStatus.ACCEPTED || b.status === BookingStatus.IN_PROGRESS,
  );
  const history = bookings.filter(
    (b) =>
      b.status !== BookingStatus.REQUESTED &&
      b.status !== BookingStatus.ACCEPTED &&
      b.status !== BookingStatus.IN_PROGRESS,
  );

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 680, paddingBottom: 64 }}>
        <Link href="/pro" className="back">
          <ArrowLeft size={14} /> {t.back}
        </Link>
        <h1 className="page">{t.ordersT}</h1>
        <div className="tip" style={{ marginTop: 0 }}>
          <div className="ti">
            <ShieldCheck size={18} />
          </div>
          <p>
            <b>{t.proTipB}</b> {t.proReqTip}
          </p>
        </div>
        <h3 className="display" style={{ fontSize: 15, margin: "6px 0 12px" }}>
          {t.newReq}
        </h3>
        {requests.length ? (
          requests.map((b) => <BookingCard key={b.id} b={b} t={t} locale={locale} />)
        ) : (
          <div className="empty">{t.emptyReq}</div>
        )}
        {confirmed.length > 0 && (
          <>
            <h3 className="display" style={{ fontSize: 15, margin: "20px 0 12px" }}>
              {t.stAccepted}
            </h3>
            {confirmed.map((b) => (
              <BookingCard key={b.id} b={b} t={t} locale={locale} />
            ))}
          </>
        )}
        {history.length > 0 && (
          <>
            <h3 className="display" style={{ fontSize: 15, margin: "20px 0 12px" }}>
              {t.historyT}
            </h3>
            {history.map((b) => (
              <BookingCard key={b.id} b={b} t={t} locale={locale} />
            ))}
          </>
        )}
      </div>
    </main>
  );
}

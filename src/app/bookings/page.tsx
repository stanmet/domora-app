// Заказы клиента: список запросов и броней со статусами.
// Карточки из prototypes/Marketplace.jsx (view "mybook"),
// экран успеха после отправки запроса из view "done".
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Check, MapPin, MessageCircle, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict, statusLabel, unitLabel } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { dateTime, eur } from "@/lib/format";
import { decrypt } from "@/lib/crypto";
import { expireOverdueRequests } from "@/lib/bookings";
import { isDemoMode, progressDemoBookings } from "@/lib/test-users/bots";
import { statusPillClass } from "@/lib/booking-units";
import { bookingRef } from "@/lib/booking-ref";
import { submitReview, editReview, deleteReview } from "./reviews-actions";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

// Расшифровка адреса; при недоступном ключе карточка не должна падать.
function safeDecrypt(payload: string | null): string | null {
  if (!payload) return null;
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");

  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const user = await ensureDbUser(authUser, locale);
  const { sent } = await searchParams;

  await expireOverdueRequests({ clientId: user.id });
  // Демо: бот-исполнитель подтверждает симулированную бронь сразу при открытии
  // заказов, чтобы демо выглядело живым без ожидания cron.
  if (await isDemoMode()) await progressDemoBookings().catch(() => 0);

  const bookings = await prisma.booking.findMany({
    where: { clientId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { title: true } },
      provider: { select: { displayName: true } },
      task: { select: { id: true } },
      thread: { select: { id: true } },
      reviews: { where: { authorId: user.id }, select: { stars: true, text: true } },
    },
  });

  const reviewLabels = {
    leave: tx.reviewLeave,
    editTitle: tx.reviewYours,
    edit: tx.reviewEdit,
    del: tx.reviewDelete,
    submit: tx.reviewSubmit,
    save: tx.reviewSave,
    placeholder: tx.reviewPlaceholder,
    rateL: tx.reviewRateL,
    needStars: tx.reviewNeedStars,
  };

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 680, paddingBottom: 64 }}>
        {sent === "1" && (
          <div className="done">
            <div className="ok">
              <Check size={40} strokeWidth={2.5} />
            </div>
            <h1>{t.sentT}</h1>
            <p>{t.sentP}</p>
          </div>
        )}
        <h1 className="page">{t.myBookings}</h1>
        {bookings.length === 0 ? (
          <div className="empty">{t.mybEmpty}</div>
        ) : (
          bookings.map((b) => {
            const address = safeDecrypt(b.addressEncrypted);
            const active = ["ACCEPTED", "IN_PROGRESS"].includes(b.status);
            return (
              <div className="bk" key={b.id}>
                <div className="bkrow">
                  <div>
                    <h4>{b.provider.displayName}</h4>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{b.listing.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                      #{bookingRef(b)}
                    </div>
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
                    <Wallet size={13} /> {eur(b.totalCents, locale)}
                  </span>
                  {address && (
                    <span>
                      <MapPin size={13} /> {address}
                    </span>
                  )}
                </div>

                <div className="bkbtns" style={{ marginTop: 10 }}>
                  {b.task && (
                    <Link href={`/tasks/${b.task.id}`} className="btn btn-ink btn-sm">
                      {tx.dealTitle} · {t.obGo}
                    </Link>
                  )}
                  {b.thread && (
                    <Link href={`/messages/${b.thread.id}`} className="btn btn-line btn-sm">
                      <MessageCircle size={14} /> {tx.dealOpenChat}
                    </Link>
                  )}
                </div>

                {/* Отзыв: доступен по завершённому заказу (выполнен или закрыт) */}
                {["COMPLETED", "CLOSED"].includes(b.status) && (
                  <ReviewForm
                    submitAction={submitReview.bind(null, b.id)}
                    editAction={editReview.bind(null, b.id)}
                    deleteAction={deleteReview.bind(null, b.id)}
                    existing={b.reviews[0] ?? null}
                    labels={reviewLabels}
                  />
                )}

                {active && <div className="cancel-policy">{tx.dealSelfResponsibility}</div>}
              </div>
            );
          })
        )}
        <div style={{ marginTop: 20 }}>
          <Link href="/catalog" className="btn btn-ink btn-sm">
            {t.findPro}
          </Link>
        </div>
      </div>
    </main>
  );
}

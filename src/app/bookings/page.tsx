// Заказы клиента: список запросов и броней со статусами.
// Карточки из prototypes/Marketplace.jsx (view "mybook"),
// экран успеха после отправки запроса из view "done".
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Check, CreditCard, FileText, MapPin, ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict, statusLabel, unitLabel } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { dateTime, eur } from "@/lib/format";
import { decrypt } from "@/lib/crypto";
import { expireOverdueRequests } from "@/lib/bookings";
import { statusPillClass } from "@/lib/booking-units";
import { refundCentsForCancel } from "@/lib/cancellation";
import { confirmBooking, disputeBooking, cancelBooking, reportNoShow } from "./actions";
import { submitReview, editReview, deleteReview } from "./reviews-actions";
import DisputeForm from "./DisputeForm";
import ReviewForm from "./ReviewForm";
import ConfirmAction from "@/components/ConfirmAction";

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

  const bookings = await prisma.booking.findMany({
    where: { clientId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { title: true, category: { select: { cancellationTier: true } } } },
      provider: { select: { displayName: true } },
      dispute: { select: { id: true } },
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
            const cancelable = ["REQUESTED", "ACCEPTED", "IN_PROGRESS"].includes(b.status);
            const refundCents =
              b.status === "REQUESTED"
                ? b.totalCents
                : refundCentsForCancel({
                    tier: b.listing.category.cancellationTier,
                    totalCents: b.totalCents,
                    clientFeeCents: b.clientFeeCents,
                    dateStart: b.dateStart,
                  }).refundCents;
            const canNoShow =
              ["ACCEPTED", "IN_PROGRESS"].includes(b.status) &&
              Date.now() > b.dateStart.getTime() + 30 * 60 * 1000;
            return (
              <div className="bk" key={b.id}>
                <div className="bkrow">
                  <div>
                    <h4>{b.provider.displayName}</h4>
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
                  {address && (
                    <span>
                      <MapPin size={13} /> {address}
                    </span>
                  )}
                </div>
                {["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLOSED", "DISPUTED"].includes(b.status) && (
                  <Link href={`/bookings/${b.id}/invoice`} className="btn btn-line btn-sm">
                    <FileText size={14} /> {t.invoiceGet}
                  </Link>
                )}
                {b.status === "DISPUTED" && b.dispute && (
                  <Link href={`/disputes/${b.dispute.id}`} className="btn btn-red btn-sm" style={{ marginLeft: 8 }}>
                    <ShieldCheck size={14} /> {t.dsOpen}
                  </Link>
                )}

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

                {/* Работа отмечена выполненной: клиент подтверждает или открывает спор */}
                {b.status === "COMPLETED" && (
                  <>
                    <div className="hold" style={{ marginTop: 10 }}>
                      <ShieldCheck size={15} /> {t.payoutNote}
                    </div>
                    <div className="bkbtns" style={{ marginTop: 8 }}>
                      <form action={confirmBooking.bind(null, b.id)}>
                        <button className="btn btn-green btn-sm">
                          <Check size={14} /> {t.bConfirm}
                        </button>
                      </form>
                      <DisputeForm
                        action={disputeBooking.bind(null, b.id)}
                        labels={{ open: t.bDispute, title: t.disputeTitle, ph: t.disputePh, send: t.disputeSend }}
                      />
                    </div>
                  </>
                )}

                {/* Отмена заказа клиентом и отметка о неявке исполнителя */}
                {(cancelable || canNoShow) && (
                  <div className="bkbtns" style={{ marginTop: 10 }}>
                    {cancelable && (
                      <ConfirmAction
                        action={cancelBooking.bind(null, b.id)}
                        label={t.cancelBooking}
                        warning={`${t.cancelWarn} ${t.cancelRefundL}: ${eur(refundCents, locale)}`}
                        confirmLabel={t.cancelConfirm}
                        backLabel={t.back}
                      />
                    )}
                    {canNoShow && (
                      <ConfirmAction
                        action={reportNoShow.bind(null, b.id)}
                        label={t.noShow}
                        warning={t.noShowWarn}
                        confirmLabel={t.noShowConfirm}
                        backLabel={t.back}
                      />
                    )}
                  </div>
                )}
                {cancelable && (
                  <Link href="/terms" className="cancel-policy">
                    {t.cancelPolicyLink}
                  </Link>
                )}
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

// «Мои заказы» (клиент) - один раздел с двумя вкладками:
// - «Ожидают выбора»: размещённые заявки (status OPEN) с откликами и кнопкой
//   «Выбрать»;
// - «В работе и завершённые»: заказы (Booking) с чатом, счётом и отзывом.
// Объединяет прежние /tasks/mine и /bookings, чтобы у клиента было одно
// понятное место «мои заказы», без развилки «задачи vs заказы».
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Calendar, Check, FileText, MapPin, MessageCircle, Star, Users, Wallet } from "lucide-react";
import { OfferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict, statusLabel, taskStatusLabel, unitLabel } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { dateTime, eur } from "@/lib/format";
import { decrypt } from "@/lib/crypto";
import { expireOverdueRequests } from "@/lib/bookings";
import { expireOverdueTasks } from "@/lib/tasks";
import { isDemoMode, progressDemoBookings } from "@/lib/test-users/bots";
import { statusPillClass } from "@/lib/booking-units";
import { bookingRef } from "@/lib/booking-ref";
import { acceptOffer } from "@/app/tasks/actions";
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

function taskPillClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "req";
    case "OFFER_ACCEPTED":
      return "ok";
    default:
      return "done";
  }
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ sent?: string; tab?: string }> }) {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");

  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const user = await ensureDbUser(authUser, locale);
  const { sent, tab: tabParam } = await searchParams;

  await expireOverdueRequests({ clientId: user.id });
  await expireOverdueTasks({ clientId: user.id });
  // Демо: бот-исполнитель подтверждает симулированную бронь сразу при открытии.
  if (await isDemoMode()) await progressDemoBookings().catch(() => 0);

  // Вкладка «Ожидают выбора»: открытые заявки клиента с откликами.
  const openTasks = await prisma.task.findMany({
    where: { clientId: user.id, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { slug: true, nameEn: true, nameRu: true } },
      offers: {
        orderBy: { createdAt: "asc" },
        include: { provider: { select: { userId: true, displayName: true, ratingCached: true, jobsCount: true } } },
      },
    },
  });

  // Вкладка «В работе и завершённые»: заказы (выбранный исполнитель).
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

  // Активная вкладка: по параметру, иначе - где есть что показать (приоритет заявкам).
  const tab = tabParam === "orders" || tabParam === "active" ? tabParam : openTasks.length > 0 ? "active" : "orders";

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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 className="page">{t.myBookings}</h1>
          <Link href="/tasks/new" className="btn btn-green btn-sm">
            {t.postTask}
          </Link>
        </div>
        <p className="sub">{t.ordSub}</p>

        <div className="chips" style={{ marginBottom: 14 }}>
          <Link href="/bookings?tab=active" className={"chip" + (tab === "active" ? " on" : "")}>
            {t.ordTabAwaiting} · {openTasks.length}
          </Link>
          <Link href="/bookings?tab=orders" className={"chip" + (tab === "orders" ? " on" : "")}>
            {t.ordTabActive} · {bookings.length}
          </Link>
        </div>

        {tab === "active" ? (
          openTasks.length === 0 ? (
            <div className="empty">{t.myTasksEmpty}</div>
          ) : (
            openTasks.map((task) => (
              <div className="bk" key={task.id}>
                <div className="bkrow">
                  <div>
                    <Link href={`/tasks/${task.id}`}>
                      <h4>{task.title}</h4>
                    </Link>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                      {categoryLabel(t, task.category.slug, locale === "ru" ? task.category.nameRu : task.category.nameEn)}
                    </div>
                  </div>
                  <span className={"pill " + taskPillClass(task.status)}>{taskStatusLabel(t, task.status)}</span>
                </div>
                <div className="meta">
                  {task.dateWanted && (
                    <span>
                      <Calendar size={13} /> {dateTime(task.dateWanted, locale)}
                    </span>
                  )}
                  <span>
                    <MapPin size={13} /> {task.city}
                  </span>
                  {(task.budgetFromCents != null || task.budgetToCents != null) && (
                    <span>
                      <Wallet size={13} />{" "}
                      {task.budgetFromCents != null && task.budgetToCents != null
                        ? `${t.fromCap} ${eur(task.budgetFromCents, locale)} · ${t.budgetToL} ${eur(task.budgetToCents, locale)}`
                        : task.budgetFromCents != null
                          ? `${t.fromCap} ${eur(task.budgetFromCents, locale)}`
                          : `${t.budgetToL} ${eur(task.budgetToCents as number, locale)}`}
                    </span>
                  )}
                </div>

                <div className="offers">
                  <div className="offers-h">
                    {t.taskOffersTitle}: {task.offers.length}
                  </div>
                  {task.offers.length === 0 ? (
                    <div className="empty" style={{ padding: "10px 0", textAlign: "left" }}>
                      {t.taskNoOffers}
                    </div>
                  ) : (
                    task.offers.map((offer) => {
                      const rating = Number(offer.provider.ratingCached);
                      const rejected = offer.status === OfferStatus.REJECTED;
                      const accepted = offer.status === OfferStatus.ACCEPTED;
                      return (
                        <div className={"offer" + (rejected ? " off" : "") + (accepted ? " on" : "")} key={offer.id}>
                          <div className="offer-top">
                            <div className="offer-who">
                              <span className="avatar">{offer.provider.displayName[0]}</span>
                              <div>
                                <div className="offer-name">{offer.provider.displayName}</div>
                                <div className="offer-sub">
                                  {rating > 0 ? (
                                    <span className="rate">
                                      <Star size={12} fill="currentColor" /> {rating.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="tag">{t.newPro}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="offer-price">{eur(offer.priceCents, locale)}</div>
                          </div>
                          {offer.message && <p className="offer-msg">{offer.message}</p>}
                          {offer.contactFilterFlag && (
                            <div className="offer-warn">
                              <AlertTriangle size={13} /> {t.offerContactWarn}
                            </div>
                          )}
                          <form action={acceptOffer.bind(null, offer.id)} style={{ marginTop: 10 }}>
                            <button className="btn btn-green btn-sm">{t.chooseOffer}</button>
                          </form>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )
        ) : bookings.length === 0 ? (
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
                    <div style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>#{bookingRef(b)}</div>
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
                  {["COMPLETED", "CLOSED"].includes(b.status) && (
                    <a href={`/bookings/${b.id}/invoice`} target="_blank" rel="noopener" className="btn btn-line btn-sm">
                      <FileText size={14} /> {t.invoiceTitle}
                    </a>
                  )}
                </div>

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
      </div>
    </main>
  );
}

// Мои задачи (клиент): список размещённых задач со статусами и откликами.
// По каждому отклику: профиль исполнителя, рейтинг, цена, сообщение и кнопка
// "Выбрать". Выбор открывает контакты и чат на странице задачи (без оплаты).
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Calendar, MapPin, Star, Wallet } from "lucide-react";
import { OfferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict, taskStatusLabel } from "@/i18n/dictionaries";
import { dateTime, eur } from "@/lib/format";
import { expireOverdueTasks } from "@/lib/tasks";
import { acceptOffer } from "../actions";

export const dynamic = "force-dynamic";

function taskPillClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "req";
    case "OFFER_ACCEPTED":
      return "ok";
    default:
      return "done"; // CLOSED, EXPIRED
  }
}

export default async function MyTasksPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/mine");

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  await expireOverdueTasks({ clientId: user.id });

  const tasks = await prisma.task.findMany({
    where: { clientId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { slug: true, nameEn: true, nameRu: true } },
      booking: { select: { id: true, status: true } },
      offers: {
        orderBy: { createdAt: "asc" },
        include: {
          provider: { select: { userId: true, displayName: true, ratingCached: true, jobsCount: true } },
        },
      },
    },
  });

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 680, paddingBottom: 64 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 className="page">{t.myTasks}</h1>
          <Link href="/tasks/new" className="btn btn-green btn-sm">
            {t.postTask}
          </Link>
        </div>
        <p className="sub">{t.myTasksSub}</p>

        {tasks.length === 0 ? (
          <div className="empty">{t.myTasksEmpty}</div>
        ) : (
          tasks.map((task) => {
            const budgetFrom = task.budgetFromCents;
            const budgetTo = task.budgetToCents;
            const canChoose = task.status === "OPEN";
            return (
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
                  {(budgetFrom != null || budgetTo != null) && (
                    <span>
                      <Wallet size={13} />{" "}
                      {budgetFrom != null && budgetTo != null
                        ? `${t.fromCap} ${eur(budgetFrom, locale)} · ${t.budgetToL} ${eur(budgetTo, locale)}`
                        : budgetFrom != null
                          ? `${t.fromCap} ${eur(budgetFrom, locale)}`
                          : `${t.budgetToL} ${eur(budgetTo as number, locale)}`}
                    </span>
                  )}
                </div>

                {/* Выбран исполнитель: ведём на страницу задачи (контакты, чат, статус). */}
                {task.status === "OFFER_ACCEPTED" && (
                  <Link href={`/tasks/${task.id}`} className="btn btn-green btn-sm" style={{ marginTop: 4 }}>
                    {t.obGo}
                  </Link>
                )}

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
                                  {offer.provider.jobsCount > 0 && rating > 0 ? (
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
                          {canChoose && (
                            <form action={acceptOffer.bind(null, offer.id)} style={{ marginTop: 10 }}>
                              <button className="btn btn-green btn-sm">{t.chooseOffer}</button>
                            </form>
                          )}
                          {accepted && <div className="offer-sent" style={{ marginTop: 8 }}>{t.tAccepted}</div>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

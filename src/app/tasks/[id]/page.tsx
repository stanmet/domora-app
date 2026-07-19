// Страница задачи с прозрачностью для обеих сторон:
// - клиент-автор видит счётчики (сколько исполнителей увидели, сколько
//   откликнулось) и список откликов с кнопкой "Выбрать";
// - исполнитель видит, что задача открыта, и сколько уже откликов (конкуренция),
//   и может откликнуться, если у него есть активная услуга в категории;
// - гость/остальные видят описание задачи и счётчик откликов.
// Точный адрес задачи (зашифрован) не показывается никогда.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Calendar, Eye, MapPin, Star, Users, Wallet } from "lucide-react";
import { OfferStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict, statusLabel, taskStatusLabel } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { langName } from "@/i18n/config";
import { CATEGORY_ICONS } from "@/components/categories";
import { budgetText, dateOnly, eur } from "@/lib/format";
import { providerActiveCategoryIds, MAX_OFFERS_PER_TASK } from "@/lib/tasks";
import { isDemoMode } from "@/lib/test-users/bots";
import { translateBatch } from "@/lib/translate";
import TranslatableText, { type TrLabels } from "@/components/TranslatableText";
import { Phone, MessageCircle, CheckCircle2, XCircle } from "lucide-react";
import OfferForm from "../OfferForm";
import { acceptOffer, cancelAcceptedTask, markTaskDone } from "../actions";

// Ссылка WhatsApp из телефона: оставляем только цифры (wa.me принимает номер
// в международном формате без плюса и пробелов).
function waLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
}

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const trLabels: TrLabels = { from: t.translatedFrom, showOriginal: t.showOriginal, showTranslation: t.showTranslation };

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, slug: true, nameEn: true, nameRu: true } },
      booking: { select: { id: true, status: true, thread: { select: { id: true } } } },
      client: { select: { isTest: true, name: true, phone: true } },
      offers: {
        orderBy: { createdAt: "asc" },
        include: {
          provider: {
            select: {
              userId: true,
              displayName: true,
              ratingCached: true,
              jobsCount: true,
              user: { select: { phone: true } },
            },
          },
        },
      },
    },
  });
  // Тестовые задачи не видны реальным пользователям даже по прямой ссылке
  // (кроме включённого демо-режима).
  const demo = await isDemoMode();
  if (!task || (task.client.isTest && !demo)) notFound();

  const authUser = await getAuthUser();
  const user = authUser?.email ? await ensureDbUser(authUser, locale) : null;
  const isOwner = user?.id === task.clientId;
  const isProvider = Boolean(user?.roles.includes(Role.PROVIDER)) && !isOwner;

  // Исполнитель открыл задачу: фиксируем просмотр (для счётчика "N увидели").
  if (isProvider && user) {
    try {
      await prisma.taskView.upsert({
        where: { taskId_providerId: { taskId: task.id, providerId: user.id } },
        create: { taskId: task.id, providerId: user.id },
        update: {},
      });
    } catch {
      // Таблица просмотров необязательна для показа задачи.
    }
  }

  let viewsCount = 0;
  try {
    viewsCount = await prisma.taskView.count({ where: { taskId: task.id } });
  } catch {
    // База/таблица недоступна: счётчик просмотров скрываем.
  }
  const offerCount = task.offers.length;

  // Право исполнителя откликнуться: активная услуга в категории задачи.
  let providerActiveCats: string[] = [];
  if (isProvider && user) providerActiveCats = await providerActiveCategoryIds(user.id);
  const canOfferCategory = providerActiveCats.includes(task.category.id);
  const alreadyOffered = Boolean(user && task.offers.some((o) => o.provider.userId === user.id));
  const isOpen = task.status === "OPEN" && task.expiresAt.getTime() > Date.now();
  const full = offerCount >= MAX_OFFERS_PER_TASK;

  const tr = await translateBatch([task.title, task.description], locale);
  const trOf = (s: string) => tr.get((s ?? "").trim()) ?? { text: s, sourceLang: locale, translated: false };
  const titleTr = trOf(task.title);
  const descTr = trOf(task.description);

  const Icon = CATEGORY_ICONS[task.category.slug] ?? CATEGORY_ICONS.other;
  const budget = budgetText(task.budgetFromCents, task.budgetToCents, locale, { from: t.fromCap, to: t.budgetToL });

  // Согласованный заказ (V1 без оплаты): выбран исполнитель, контакты открыты.
  const acceptedOffer = task.offers.find((o) => o.status === OfferStatus.ACCEPTED) ?? null;
  const bookingStatus = task.booking?.status ?? null;
  const isAcceptedProvider = Boolean(user && acceptedOffer && acceptedOffer.provider.userId === user.id);
  // Контакты видят только две стороны согласованного заказа.
  const showDeal = Boolean(acceptedOffer && task.booking && (isOwner || isAcceptedProvider));
  const dealActive = bookingStatus === "IN_PROGRESS";
  const dealDone = bookingStatus === "COMPLETED" || bookingStatus === "CLOSED";
  const dealCancelled = bookingStatus === "CANCELLED_BY_CLIENT" || bookingStatus === "CANCELLED_BY_PROVIDER";
  // Контакт другой стороны: владельцу показываем телефон исполнителя, исполнителю - телефон клиента.
  const counterpartName = isOwner ? acceptedOffer?.provider.displayName ?? "" : task.client.name;
  const counterpartPhone = isOwner ? acceptedOffer?.provider.user.phone ?? null : task.client.phone;
  const chatThreadId = task.booking?.thread?.id ?? null;

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 720, paddingBottom: 64 }}>
        <Link href="/" className="back">
          <ArrowLeft size={14} /> {t.back}
        </Link>

        <div className="taskhead" style={{ marginTop: 8 }}>
          <span className="tasktag">
            <Icon size={13} /> {categoryLabel(t, task.category.slug, locale === "ru" ? task.category.nameRu : task.category.nameEn)}
          </span>
          <span className={"pill " + (isOpen ? "req" : "done")}>{taskStatusLabel(t, task.status)}</span>
        </div>

        <TranslatableText
          as="h1"
          className="page"
          display={titleTr.text}
          original={task.title}
          translated={titleTr.translated}
          sourceLangName={langName(titleTr.sourceLang)}
          labels={trLabels}
        />

        <div className="taskmeta">
          {task.dateWanted && (
            <span className="chip-date">
              <Calendar size={15} /> {dateOnly(task.dateWanted, locale)}
            </span>
          )}
          <span className="chip-city">
            <MapPin size={15} /> {task.city}
          </span>
          {budget && (
            <span className="chip-money">
              <Wallet size={15} /> {budget}
            </span>
          )}
        </div>

        {task.description && task.description !== task.title && (
          <TranslatableText
            display={descTr.text}
            original={task.description}
            translated={descTr.translated}
            sourceLangName={langName(descTr.sourceLang)}
            labels={trLabels}
            style={{ fontSize: 15, lineHeight: 1.6, color: "var(--muted)", margin: "10px 0 0" }}
          />
        )}

        {/* Прозрачность: сколько увидели и сколько откликнулось */}
        <div className="taskstats">
          <div className="taskstat">
            <b>{viewsCount}</b>
            <span>
              <Eye size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              {t.statViewed}
            </span>
          </div>
          <div className="taskstat">
            <b>{offerCount}</b>
            <span>
              <Users size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              {t.statOffers}
            </span>
          </div>
        </div>

        {/* Согласованный заказ: контакты открыты, статус и действия */}
        {showDeal && (
          <div className="card" style={{ marginTop: 18, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{tx.dealTitle}</h3>
              <span className={"pill " + (dealActive ? "req" : dealCancelled ? "off" : "done")}>
                {statusLabel(t, bookingStatus ?? "")}
              </span>
            </div>

            <div className="offer-who" style={{ marginBottom: 12 }}>
              <span className="avatar">{counterpartName[0]?.toUpperCase()}</span>
              <div>
                <div className="offer-name">{counterpartName}</div>
                <div className="offer-sub">{isOwner ? tx.dealChosenPro : tx.dealClient}</div>
              </div>
            </div>

            {dealActive && (
              <>
                <p className="sub" style={{ margin: "0 0 10px" }}>{tx.dealContactsNote}</p>
                {counterpartPhone ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a className="btn btn-line btn-sm" href={`tel:${counterpartPhone}`}>
                      <Phone size={14} /> {counterpartPhone}
                    </a>
                    <a className="btn btn-green btn-sm" href={waLink(counterpartPhone)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={14} /> {tx.dealWhatsApp}
                    </a>
                  </div>
                ) : (
                  <div className="empty" style={{ textAlign: "left", padding: "6px 0", fontSize: 13 }}>{tx.dealNoPhone}</div>
                )}
                {user && !user.phone && (
                  <div className="empty" style={{ textAlign: "left", padding: "6px 0", fontSize: 13 }}>
                    <Link href="/account">{tx.dealAddPhone}</Link>
                  </div>
                )}
              </>
            )}

            {dealDone && <div className="offer-sent" style={{ marginTop: 4 }}>{tx.dealDoneNote}</div>}
            {dealCancelled && (
              <div className="empty" style={{ textAlign: "left", padding: "6px 0" }}>{tx.dealCancelledNote}</div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {chatThreadId && (
                <Link href={`/messages/${chatThreadId}`} className="btn btn-line btn-sm">
                  <MessageCircle size={14} /> {tx.dealOpenChat}
                </Link>
              )}
              {isOwner && dealActive && (
                <>
                  <form action={markTaskDone.bind(null, task.id)}>
                    <button className="btn btn-green btn-sm">
                      <CheckCircle2 size={14} /> {tx.dealMarkDone}
                    </button>
                  </form>
                  <form action={cancelAcceptedTask.bind(null, task.id)}>
                    <button className="btn btn-line btn-sm">
                      <XCircle size={14} /> {tx.dealCancel}
                    </button>
                  </form>
                </>
              )}
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}>{tx.dealSelfResponsibility}</div>
          </div>
        )}

        {/* Исполнитель: конкуренция и форма отклика */}
        {isProvider && !isAcceptedProvider && (
          <div className="taskaction" style={{ marginTop: 18 }}>
            {!isOpen ? (
              <div className="empty" style={{ textAlign: "left", padding: "8px 0" }}>{t.offerClosed}</div>
            ) : alreadyOffered ? (
              <div className="offer-sent">{t.offerSent}</div>
            ) : !canOfferCategory ? (
              <div className="empty" style={{ textAlign: "left", padding: "8px 0" }}>{t.offerNoListing}</div>
            ) : full ? (
              <div className="empty" style={{ textAlign: "left", padding: "8px 0" }}>{t.offerMax}</div>
            ) : (
              <>
                <p className="sub" style={{ marginBottom: 10 }}>{t.competitionNote}</p>
                <OfferForm taskId={task.id} t={t} />
              </>
            )}
          </div>
        )}

        {/* Автор: список откликов */}
        {isOwner && (
          <>
            <div className="offers">
              <div className="offers-h">
                {t.taskOffersTitle}: {offerCount}
              </div>
              {offerCount === 0 ? (
                <div className="empty" style={{ padding: "10px 0", textAlign: "left" }}>{t.taskNoOffers}</div>
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
                      {task.status === "OPEN" && (
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
          </>
        )}

        {/* Гость / клиент-не-автор: приглашение разместить свою задачу */}
        {!isOwner && !isProvider && (
          <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/tasks/new" className="btn btn-green btn-sm">{t.postTask}</Link>
            {!user && (
              <Link href="/signup?role=pro" className="btn btn-line btn-sm">{t.becomePro}</Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

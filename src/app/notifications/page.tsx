// Страница уведомлений: список событий пользователя (запросы, ответы,
// сообщения, выплаты, модерация). При открытии помечаем непрочитанные
// прочитанными в фоне.
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict, type Dict } from "@/i18n/dictionaries";
import { dateTime } from "@/lib/format";
import { bookingRef } from "@/lib/booking-ref";

export const dynamic = "force-dynamic";

// Тип уведомления -> текст (ключ словаря) и куда ведёт.
function notifMeta(type: string): { textKey: keyof Dict; href: string } {
  switch (type) {
    case "new_request":
      return { textKey: "ntfNewRequest", href: "/pro/bookings" };
    case "accepted":
      return { textKey: "ntfAccepted", href: "/bookings" };
    case "declined":
      return { textKey: "ntfDeclined", href: "/bookings" };
    case "completed":
      return { textKey: "ntfCompleted", href: "/bookings" };
    case "payout":
      return { textKey: "ntfPayout", href: "/pro/bookings" };
    case "new_offer":
      return { textKey: "ntfNewOffer", href: "/tasks/mine" };
    case "offer_accepted":
      return { textKey: "ntfOfferAccepted", href: "/pro/bookings" };
    case "message":
      return { textKey: "ntfMessage", href: "/messages" };
    case "dispute":
      return { textKey: "ntfDispute", href: "/pro/bookings" };
    case "client_cancelled":
      return { textKey: "ntfClientCancelled", href: "/pro/bookings" };
    case "provider_cancelled":
      return { textKey: "ntfProviderCancelled", href: "/bookings" };
    case "replacement":
      return { textKey: "ntfReplacement", href: "/tasks" };
    case "listing_approved":
      return { textKey: "ntfApproved", href: "/pro/services" };
    case "listing_rejected":
      return { textKey: "ntfRejected", href: "/pro/services" };
    case "chargeback":
      return { textKey: "ntfChargeback", href: "/admin?tab=disputes" };
    default:
      return { textKey: "notifTitle", href: "/" };
  }
}

export default async function NotificationsPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/notifications");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  let items: { id: string; type: string; createdAt: Date; readAt: Date | null; payload: unknown }[] = [];
  try {
    items = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, createdAt: true, readAt: true, payload: true },
    });
  } catch {
    // Таблица ещё не готова: показываем пустой список.
  }

  // Номера заказов для уведомлений, привязанных к брони (одним запросом).
  const bookingIdOf = (payload: unknown): string | null => {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const v = (payload as Record<string, unknown>).bookingId;
      if (typeof v === "string") return v;
    }
    return null;
  };
  const bookingIds = Array.from(new Set(items.map((n) => bookingIdOf(n.payload)).filter((v): v is string => Boolean(v))));
  const refById = new Map<string, string>();
  if (bookingIds.length) {
    try {
      const rows = await prisma.booking.findMany({ where: { id: { in: bookingIds } }, select: { id: true, ref: true } });
      for (const r of rows) refById.set(r.id, bookingRef(r));
    } catch {
      // Не критично: покажем текст без номера.
    }
  }

  // Помечаем непрочитанные прочитанными после ответа (не тормозим страницу).
  after(async () => {
    try {
      await prisma.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
      });
    } catch {
      // no-op
    }
  });

  return (
    <main className="wrap sec">
      <h1 className="page">{t.notifTitle}</h1>
      <p className="sub">{t.notifSub}</p>

      {items.length === 0 ? (
        <div className="empty">{t.notifEmpty}</div>
      ) : (
        <div className="notif-list">
          {items.map((n) => {
            const meta = notifMeta(n.type);
            const bId = bookingIdOf(n.payload);
            const ref = bId ? refById.get(bId) : null;
            return (
              <Link href={meta.href} className={"notif" + (n.readAt ? "" : " unread")} key={n.id}>
                <span className="notif-ic">
                  <Bell size={16} />
                </span>
                <span className="notif-main">
                  <span className="notif-text">
                    {t[meta.textKey] as string}
                    {ref && <span style={{ color: "var(--muted)" }}> · #{ref}</span>}
                  </span>
                  <span className="notif-time">{dateTime(n.createdAt, locale)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

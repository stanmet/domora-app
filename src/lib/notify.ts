// Единая точка создания уведомлений. Хранятся в таблице Notification и
// показываются пользователю в колокольчике и на странице /notifications.
// Дополнительно отправляется email (если подключён почтовый сервис Resend,
// см. src/lib/email.ts). Никогда не роняет основной поток: ошибки логируются.
import { prisma } from "@/lib/prisma";
import { Role, type Prisma } from "@prisma/client";
import { getDict, type Dict } from "@/i18n/dictionaries";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import { emailEnabled, emailLayout, sendEmail } from "@/lib/email";
import { bookingRef } from "@/lib/booking-ref";

// Достаём bookingId из payload уведомления, если он там есть.
function bookingIdOf(payload: Prisma.InputJsonValue): string | undefined {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const v = (payload as Record<string, unknown>).bookingId;
    if (typeof v === "string") return v;
  }
  return undefined;
}

export type NotificationType =
  | "new_request"
  | "accepted"
  | "declined"
  | "completed"
  | "payout"
  | "new_offer"
  | "offer_accepted"
  | "message"
  | "dispute"
  | "client_cancelled"
  | "provider_cancelled"
  | "replacement"
  | "listing_approved"
  | "listing_rejected"
  | "chargeback";

// Тип уведомления -> ключ локализованного текста и путь для ссылки в письме.
const META: Record<NotificationType, { textKey: keyof Dict; path: string }> = {
  new_request: { textKey: "ntfNewRequest", path: "/pro/bookings" },
  accepted: { textKey: "ntfAccepted", path: "/bookings" },
  declined: { textKey: "ntfDeclined", path: "/bookings" },
  completed: { textKey: "ntfCompleted", path: "/bookings" },
  payout: { textKey: "ntfPayout", path: "/pro/bookings" },
  new_offer: { textKey: "ntfNewOffer", path: "/tasks/mine" },
  offer_accepted: { textKey: "ntfOfferAccepted", path: "/pro/bookings" },
  message: { textKey: "ntfMessage", path: "/messages" },
  dispute: { textKey: "ntfDispute", path: "/bookings" },
  client_cancelled: { textKey: "ntfClientCancelled", path: "/pro/bookings" },
  provider_cancelled: { textKey: "ntfProviderCancelled", path: "/bookings" },
  replacement: { textKey: "ntfReplacement", path: "/tasks" },
  listing_approved: { textKey: "ntfApproved", path: "/pro/services" },
  listing_rejected: { textKey: "ntfRejected", path: "/pro/services" },
  chargeback: { textKey: "ntfChargeback", path: "/admin?tab=disputes" },
};

// Событие-сообщение шлём в почту редко (шумно): пропускаем email для "message".
const NO_EMAIL: NotificationType[] = ["message"];

export async function notify(
  userId: string,
  type: NotificationType,
  payload: Prisma.InputJsonValue = {},
): Promise<void> {
  try {
    // Тестовые (синтетические) аккаунты не получают ни уведомлений, ни писем:
    // им незачем, а email-адреса у них нероутируемые (@testuser.domora.local).
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { isTest: true } });
    if (target?.isTest) return;
    await prisma.notification.create({ data: { userId, type, payload } });
  } catch (e) {
    console.error("notify failed", userId, type, e);
  }

  // Email best-effort, только если сервис подключён и тип этого заслуживает.
  if (!emailEnabled() || NO_EMAIL.includes(type)) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, locale: true } });
    if (!user?.email) return;
    const locale = (LOCALES as readonly string[]).includes(user.locale) ? (user.locale as Locale) : DEFAULT_LOCALE;
    const t = getDict(locale);
    const meta = META[type];
    const text = t[meta.textKey] as string;
    const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const url = base ? `${base}${meta.path}` : undefined;

    // Номер заказа в теме и теле письма, если уведомление относится к брони.
    const bId = bookingIdOf(payload);
    let refLine = "";
    if (bId) {
      const bk = await prisma.booking.findUnique({ where: { id: bId }, select: { id: true, ref: true } });
      if (bk) refLine = `#${bookingRef(bk)}`;
    }
    await sendEmail({
      to: user.email,
      subject: refLine ? `Domora: ${text} · ${refLine}` : `Domora: ${text}`,
      html: emailLayout(text, refLine, url, url ? t.notifTitle : undefined),
    });
  } catch (e) {
    console.error("notify email failed", userId, type, e);
  }
}

// Уведомить всех администраторов о серьёзном событии (например, chargeback).
// Тестовые аккаунты в админы не попадают, поэтому фильтр по isTest не нужен.
export async function notifyAdmins(type: NotificationType, payload: Prisma.InputJsonValue = {}): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { roles: { has: Role.ADMIN } }, select: { id: true } });
    await Promise.all(admins.map((a) => notify(a.id, type, payload)));
  } catch (e) {
    console.error("notifyAdmins failed", type, e);
  }
}

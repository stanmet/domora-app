// Словарь админки: только английский и русский (по требованию задачи).
// Язык берется из общей cookie locale; для остальных языков падаем на английский.
import type { Locale } from "@/i18n/config";

const en = {
  title: "Admin",
  sub: "Moderation, users and payments.",
  tabModeration: "Moderation",
  tabUsers: "Users",
  tabProviders: "Providers",
  tabBookings: "Bookings",

  // Модерация услуг
  modEmpty: "No services awaiting moderation.",
  modProvider: "Provider",
  modCategory: "Category",
  modPrice: "Price",
  approve: "Approve",
  reject: "Reject",
  rejectTitle: "Reject service",
  rejectReason: "Reason (shown to the provider)",
  rejectPlaceholder: "What to fix before resubmitting",
  cancel: "Cancel",
  submit: "Submit",

  // Пользователи и исполнители
  colName: "Name",
  colEmail: "Email",
  colRoles: "Roles",
  colStatus: "Status",
  colCity: "City",
  colActions: "Actions",
  freeze: "Freeze",
  unblock: "Unblock",
  usersEmpty: "No users.",
  providersEmpty: "No providers.",

  // Заказы и возвраты
  colClient: "Client",
  colService: "Service",
  colAmount: "Amount",
  colRefunded: "Refunded",
  refund: "Refund",
  refundTitle: "Refund to client",
  refundAmount: "Amount, €",
  refundFull: "Full amount",
  refundNote: "Money returns to the client's card via Stripe. Partial refunds are allowed.",
  refundBtn: "Refund",
  bookingsEmpty: "No bookings.",
  noPayment: "No captured payment",

  errGeneric: "Something went wrong. Please try again.",
  errRefund: "Refund failed. Check the amount and try again.",

  statuses: {
    // UserStatus
    ACTIVE: "Active",
    RESTRICTED: "Restricted",
    FROZEN: "Frozen",
    BANNED: "Banned",
    // ProviderStatus (пересекается по именам)
    DRAFT: "Draft",
    MODERATION: "Moderation",
    PAUSED: "Paused",
    // BookingStatus
    REQUESTED: "Requested",
    ACCEPTED: "Accepted",
    DECLINED: "Declined",
    EXPIRED: "Expired",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    DISPUTED: "Disputed",
    CANCELLED_BY_CLIENT: "Cancelled (client)",
    CANCELLED_BY_PROVIDER: "Cancelled (provider)",
    CLOSED: "Closed",
    REJECTED: "Rejected",
  } as Record<string, string>,
};

export type AdminDict = typeof en;

const ru: AdminDict = {
  title: "Админка",
  sub: "Модерация, пользователи и платежи.",
  tabModeration: "Модерация",
  tabUsers: "Пользователи",
  tabProviders: "Исполнители",
  tabBookings: "Заказы",

  modEmpty: "Нет услуг на модерации.",
  modProvider: "Исполнитель",
  modCategory: "Категория",
  modPrice: "Цена",
  approve: "Одобрить",
  reject: "Отклонить",
  rejectTitle: "Отклонить услугу",
  rejectReason: "Причина (видна исполнителю)",
  rejectPlaceholder: "Что исправить перед повторной отправкой",
  cancel: "Отмена",
  submit: "Отправить",

  colName: "Имя",
  colEmail: "Email",
  colRoles: "Роли",
  colStatus: "Статус",
  colCity: "Город",
  colActions: "Действия",
  freeze: "Заморозить",
  unblock: "Разблокировать",
  usersEmpty: "Пользователей нет.",
  providersEmpty: "Исполнителей нет.",

  colClient: "Клиент",
  colService: "Услуга",
  colAmount: "Сумма",
  colRefunded: "Возвращено",
  refund: "Вернуть",
  refundTitle: "Возврат клиенту",
  refundAmount: "Сумма, €",
  refundFull: "Вся сумма",
  refundNote: "Деньги возвращаются на карту клиента через Stripe. Частичный возврат разрешен.",
  refundBtn: "Вернуть",
  bookingsEmpty: "Заказов нет.",
  noPayment: "Списания не было",

  errGeneric: "Что-то пошло не так. Попробуйте еще раз.",
  errRefund: "Возврат не прошел. Проверьте сумму и попробуйте еще раз.",

  statuses: {
    ACTIVE: "Активен",
    RESTRICTED: "Ограничен",
    FROZEN: "Заморожен",
    BANNED: "Забанен",
    DRAFT: "Черновик",
    MODERATION: "На модерации",
    PAUSED: "Пауза",
    REQUESTED: "Запрос",
    ACCEPTED: "Принят",
    DECLINED: "Отклонен",
    EXPIRED: "Истек",
    IN_PROGRESS: "Выполняется",
    COMPLETED: "Завершен",
    DISPUTED: "Спор",
    CANCELLED_BY_CLIENT: "Отменен клиентом",
    CANCELLED_BY_PROVIDER: "Отменен исполнителем",
    CLOSED: "Закрыт",
    REJECTED: "Отклонена",
  },
};

// Админка двуязычная: русский для локали ru, иначе английский.
export function getAdminDict(locale: Locale): AdminDict {
  return locale === "ru" ? ru : en;
}

export function adminStatus(t: AdminDict, status: string): string {
  return t.statuses[status] ?? status;
}

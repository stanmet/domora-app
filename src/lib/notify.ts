// Единая точка создания уведомлений. Хранятся в таблице Notification и
// показываются пользователю в колокольчике и на странице /notifications.
// Никогда не роняет основной поток: ошибка записи только логируется.
// Сюда же позже можно добавить отправку письма (при подключённом почтовом сервисе).
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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
  | "listing_approved"
  | "listing_rejected";

export async function notify(
  userId: string,
  type: NotificationType,
  payload: Prisma.InputJsonValue = {},
): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, type, payload } });
  } catch (e) {
    console.error("notify failed", userId, type, e);
  }
}

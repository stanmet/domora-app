// Полное (жёсткое) удаление пользователей из базы, без следов.
// Чистит ВСЕ зависимые записи в правильном порядке, иначе внешние ключи
// (брони, отзывы, чат, платёжные остатки, споры, страйки, документы) блокируют
// удаление. Используется и для тестовых аккаунтов, и для удаления реального
// пользователя из админки. Само удаление из Supabase Auth делается отдельно
// (см. src/app/admin/actions.ts), т.к. это внешняя система.
import { prisma } from "@/lib/prisma";

// Удаляем порциями: одна огромная транзакция на десятки пользователей упирается
// в таймаут/лимиты базы (через пул Supabase). Небольшие порции надёжнее.
export async function purgeUsers(userIds: string[]): Promise<void> {
  const CHUNK = 10;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    await purgeChunk(userIds.slice(i, i + CHUNK));
  }
}

async function purgeChunk(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  // Задачи пользователей: нужны, чтобы почистить их отклики и просмотры
  // (у TaskView нет relation на Task, фильтруем по taskId).
  const tasks = await prisma.task.findMany({ where: { clientId: { in: userIds } }, select: { id: true } });
  const taskIds = tasks.map((t) => t.id);

  // Брони, где пользователь - клиент или исполнитель, со всем, что на них висит.
  const bookings = await prisma.booking.findMany({
    where: { OR: [{ clientId: { in: userIds } }, { providerId: { in: userIds } }] },
    select: { id: true, thread: { select: { id: true } }, payment: { select: { id: true } }, dispute: { select: { id: true } } },
  });
  const bookingIds = bookings.map((b) => b.id);
  const threadIds = bookings.map((b) => b.thread?.id).filter((v): v is string => Boolean(v));
  const paymentIds = bookings.map((b) => b.payment?.id).filter((v): v is string => Boolean(v));
  const disputeIds = bookings.map((b) => b.dispute?.id).filter((v): v is string => Boolean(v));

  await prisma.$transaction([
    // 1) Всё, что висит на бронях пользователя.
    prisma.disputeMessage.deleteMany({ where: { disputeId: { in: disputeIds } } }),
    prisma.dispute.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.message.deleteMany({ where: { threadId: { in: threadIds } } }),
    prisma.thread.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.review.deleteMany({
      where: { OR: [{ bookingId: { in: bookingIds } }, { authorId: { in: userIds } }, { targetId: { in: userIds } }] },
    }),
    prisma.bookingEvent.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.quote.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.transfer.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    prisma.refund.deleteMany({ where: { paymentId: { in: paymentIds } } }),
    prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } }),
    // Чужие (не удаляемые) задачи отвязываем от удаляемых броней.
    prisma.task.updateMany({ where: { bookingId: { in: bookingIds } }, data: { bookingId: null } }),
    prisma.booking.deleteMany({ where: { id: { in: bookingIds } } }),
    // 2) Прямые связи самого пользователя.
    prisma.offer.deleteMany({ where: { OR: [{ providerId: { in: userIds } }, { taskId: { in: taskIds } }] } }),
    prisma.taskView.deleteMany({ where: { OR: [{ providerId: { in: userIds } }, { taskId: { in: taskIds } }] } }),
    prisma.strike.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.providerDocument.deleteMany({ where: { providerId: { in: userIds } } }),
    prisma.listing.deleteMany({ where: { providerId: { in: userIds } } }),
    prisma.task.deleteMany({ where: { clientId: { in: userIds } } }),
    prisma.favorite.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { providerId: { in: userIds } }] } }),
    prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.providerProfile.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
}

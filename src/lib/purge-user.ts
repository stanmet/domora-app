// Полное (жёсткое) удаление пользователей из базы, без следов.
// Чистит ВСЕ зависимые записи в правильном порядке (иначе внешние ключи блокируют
// удаление). Используется и для тестовых аккаунтов, и для удаления реального
// пользователя из админки. Удаление из Supabase Auth - отдельно (admin/actions.ts).
//
// Важно: удаляем ЧЕРЕЗ СВЯЗИ по небольшому списку id пользователей, а не собираем
// тысячи id броней/сообщений в один запрос IN (...) - иначе на «плодовитых» ботах
// запрос распухает и падает. И без единой огромной транзакции - последовательными
// шагами (порциями), чтобы не упираться в лимиты пула Supabase.
import { prisma } from "@/lib/prisma";

export async function purgeUsers(userIds: string[]): Promise<void> {
  // Один проход по всем id сразу: список пользователей маленький, а удаление идёт
  // через связи (без сбора тысяч id броней), поэтому дробление только замедляло бы
  // (каждая порция заново сканирует таблицы). Порции оставляем лишь как страховку
  // на экстремально большое число пользователей.
  const CHUNK = 300;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    await purgeChunk(userIds.slice(i, i + CHUNK));
  }
}

async function purgeChunk(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  // Условие «бронь, где пользователь клиент или исполнитель» (id-список маленький).
  const bookingWhere = { OR: [{ clientId: { in: ids } }, { providerId: { in: ids } }] };

  // 1) Всё, что висит на бронях пользователя - через связи, без сбора id.
  await prisma.disputeMessage.deleteMany({ where: { dispute: { booking: bookingWhere } } });
  await prisma.dispute.deleteMany({ where: { booking: bookingWhere } });
  await prisma.message.deleteMany({ where: { thread: { booking: bookingWhere } } });
  await prisma.thread.deleteMany({ where: { booking: bookingWhere } });
  await prisma.review.deleteMany({
    where: { OR: [{ booking: bookingWhere }, { authorId: { in: ids } }, { targetId: { in: ids } }] },
  });
  await prisma.bookingEvent.deleteMany({ where: { booking: bookingWhere } });
  await prisma.quote.deleteMany({ where: { booking: bookingWhere } });
  await prisma.transfer.deleteMany({ where: { booking: bookingWhere } });

  // Refund ссылается на payment по id (без relation) - берём id платежей (их мало).
  const payments = await prisma.payment.findMany({ where: { booking: bookingWhere }, select: { id: true } });
  if (payments.length) {
    await prisma.refund.deleteMany({ where: { paymentId: { in: payments.map((p) => p.id) } } });
  }
  await prisma.payment.deleteMany({ where: { booking: bookingWhere } });

  // Чужие (не удаляемые) задачи отвязываем от удаляемых броней, затем удаляем брони.
  await prisma.task.updateMany({ where: { booking: bookingWhere }, data: { bookingId: null } });
  await prisma.booking.deleteMany({ where: bookingWhere });

  // 2) Прямые связи самих пользователей.
  await prisma.offer.deleteMany({ where: { OR: [{ providerId: { in: ids } }, { task: { clientId: { in: ids } } }] } });
  await prisma.taskView.deleteMany({ where: { providerId: { in: ids } } });
  await prisma.strike.deleteMany({ where: { userId: { in: ids } } });
  await prisma.providerDocument.deleteMany({ where: { providerId: { in: ids } } });
  await prisma.listing.deleteMany({ where: { providerId: { in: ids } } });
  await prisma.task.deleteMany({ where: { clientId: { in: ids } } });
  await prisma.favorite.deleteMany({ where: { OR: [{ userId: { in: ids } }, { providerId: { in: ids } }] } });
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.providerProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

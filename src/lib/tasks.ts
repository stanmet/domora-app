// Серверная логика доски задач: ленивое истечение задач без выбранного
// исполнителя и вспомогательные выборки. Задача живёт 7 дней (docs/domora-spec.md,
// доска задач). Отдельного воркера пока нет, поэтому просроченные OPEN
// помечаются EXPIRED при открытии лент, как это сделано для броней.
import { ListingStatus, TaskStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const TASK_TTL_DAYS = 7;
export const MAX_OFFERS_PER_TASK = 5;

export async function expireOverdueTasks(where: Prisma.TaskWhereInput): Promise<void> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Закрываем OPEN-задачи, у которых вышел 7-дневный срок ИЛИ прошла желаемая
  // дата: по такой задаче нельзя выбрать исполнителя и оплатить «в прошлое».
  await prisma.task.updateMany({
    where: {
      ...where,
      status: TaskStatus.OPEN,
      OR: [{ expiresAt: { lt: now } }, { dateWanted: { lt: startOfToday } }],
    },
    data: { status: TaskStatus.EXPIRED },
  });
}

// Фильтр «живой» открытой задачи для публичных лент: статус OPEN (значит,
// исполнитель ещё не принят), не истёк 7-дневный срок и желаемая дата, если
// она указана, ещё не прошла. Такие задачи сами пропадают из ленты, как только
// срок вышел или клиент выбрал исполнителя.
export function openTaskVisibilityWhere(): Prisma.TaskWhereInput {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    status: TaskStatus.OPEN,
    expiresAt: { gt: now },
    // Тестовые задачи (от синтетических клиентов) не показываем реальным людям.
    client: { isTest: false },
    OR: [{ dateWanted: null }, { dateWanted: { gte: startOfToday } }],
  };
}

// Категории, в которых у исполнителя есть активная (одобренная) услуга.
// Только по ним он видит задачи в ленте и может откликаться.
export async function providerActiveCategoryIds(providerId: string): Promise<string[]> {
  const rows = await prisma.listing.findMany({
    where: { providerId, status: ListingStatus.ACTIVE },
    select: { categoryId: true },
    distinct: ["categoryId"],
  });
  return rows.map((r) => r.categoryId);
}

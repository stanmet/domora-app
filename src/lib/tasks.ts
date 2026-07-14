// Серверная логика доски задач: ленивое истечение задач без выбранного
// исполнителя и вспомогательные выборки. Задача живёт 7 дней (docs/domora-spec.md,
// доска задач). Отдельного воркера пока нет, поэтому просроченные OPEN
// помечаются EXPIRED при открытии лент, как это сделано для броней.
import { ListingStatus, TaskStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const TASK_TTL_DAYS = 7;
export const MAX_OFFERS_PER_TASK = 5;

export async function expireOverdueTasks(where: Prisma.TaskWhereInput): Promise<void> {
  await prisma.task.updateMany({
    where: { ...where, status: TaskStatus.OPEN, expiresAt: { lt: new Date() } },
    data: { status: TaskStatus.EXPIRED },
  });
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

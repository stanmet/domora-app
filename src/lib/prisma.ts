import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Диагностика: при PRISMA_LOG_QUERIES=1 логируем каждый SQL-запрос (для замера
// числа обращений к базе на страницу). В обычной работе выключено.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(process.env.PRISMA_LOG_QUERIES === "1" ? { log: ["query"] } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

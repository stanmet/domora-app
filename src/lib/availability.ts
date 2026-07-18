// Проверка доступности исполнителя с обращением к базе (блокировки дат).
// Единая для сайта и API. Чистая логика расписания - в availability-core.ts.
import { prisma } from "@/lib/prisma";
import { dayKeyUTC } from "@/lib/availability-core";

export * from "@/lib/availability-core";

export async function isProviderAvailable(providerId: string, dateStart: Date): Promise<boolean> {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: providerId },
    select: { workDays: true, workStartMin: true, workEndMin: true },
  });
  if (!profile) return false;
  const weekday = dateStart.getUTCDay();
  if (!profile.workDays.includes(weekday)) return false;
  const minutes = dateStart.getUTCHours() * 60 + dateStart.getUTCMinutes();
  if (minutes < profile.workStartMin || minutes > profile.workEndMin) return false;

  const key = dayKeyUTC(dateStart);
  const off = await prisma.timeOff.findFirst({
    where: { providerId, date: new Date(`${key}T00:00:00.000Z`) },
    select: { id: true },
  });
  return !off;
}

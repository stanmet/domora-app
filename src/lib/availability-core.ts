// Чистая логика доступности БЕЗ обращения к базе - можно импортировать и в
// клиентские компоненты (форма бронирования), и на сервере. Проверка с базой -
// в availability.ts.

export interface WorkSchedule {
  workDays: number[]; // 0=вс .. 6=сб
  workStartMin: number; // минуты от полуночи
  workEndMin: number;
}

// Ключ даты YYYY-MM-DD в UTC (совпадает с хранением TimeOff.date @db.Date).
export function dayKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Попадает ли момент в расписание: рабочий день недели, окно приёма и не
// заблокированный день. blockedDays - множество ключей YYYY-MM-DD.
export function isWithinSchedule(schedule: WorkSchedule, dateStart: Date, blockedDays: Set<string>): boolean {
  const weekday = dateStart.getUTCDay();
  if (!schedule.workDays.includes(weekday)) return false;
  const minutes = dateStart.getUTCHours() * 60 + dateStart.getUTCMinutes();
  if (minutes < schedule.workStartMin || minutes > schedule.workEndMin) return false;
  if (blockedDays.has(dayKeyUTC(dateStart))) return false;
  return true;
}

export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

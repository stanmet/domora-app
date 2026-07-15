// Настройки количества для формы брони по единице оплаты услуги.
// Файл без серверных импортов: используется и в клиентских компонентах.

export const REQUEST_TTL_HOURS = 72;
// Окно спора после завершения работы: если клиент не открыл спор за это время
// (или подтвердил раньше), исполнителю уходит выплата (docs/domora-spec.md).
export const DISPUTE_WINDOW_HOURS = 24;

export type QtyConfig = { min: number; def: number; step: number };

export const QTY_CONFIG: Record<string, QtyConfig> = {
  PER_GUEST: { min: 1, def: 4, step: 1 },
  PER_M2: { min: 20, def: 50, step: 10 },
  PER_HOUR: { min: 1, def: 2, step: 1 },
  PER_SESSION: { min: 1, def: 1, step: 1 },
  PER_EVENT: { min: 1, def: 1, step: 1 },
  FIXED_QUOTE: { min: 1, def: 1, step: 1 },
};

export function qtyConfig(unit: string): QtyConfig {
  return QTY_CONFIG[unit] ?? { min: 1, def: 1, step: 1 };
}

// Класс цветной плашки статуса брони (стили .pill в globals.css).
export function statusPillClass(status: string): string {
  switch (status) {
    case "REQUESTED":
      return "req";
    case "ACCEPTED":
    case "IN_PROGRESS":
      return "ok";
    case "COMPLETED":
    case "CLOSED":
      return "done";
    default:
      return "dec"; // DECLINED, EXPIRED, DISPUTED, CANCELLED_*
  }
}

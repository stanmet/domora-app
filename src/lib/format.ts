import { LOCALE_TAGS, type Locale } from "@/i18n/config";

// Цена из центов в евро: €55 или €2,50 в формате языка интерфейса.
export function eur(cents: number, locale: Locale): string {
  const n = cents / 100;
  return (
    "€" +
    n.toLocaleString(LOCALE_TAGS[locale], {
      minimumFractionDigits: n % 1 ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

// Дата и время брони в коротком формате языка интерфейса: 18.07, 18:30.
export function dateTime(d: Date, locale: Locale): string {
  return d.toLocaleString(LOCALE_TAGS[locale], {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Только дата, без времени: 18.07.2026.
export function dateOnly(d: Date, locale: Locale): string {
  return d.toLocaleDateString(LOCALE_TAGS[locale], { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Диапазон бюджета задачи с подписями "От"/"До" на языке интерфейса.
export function budgetText(
  from: number | null,
  to: number | null,
  locale: Locale,
  labels: { from: string; to: string },
): string | null {
  if (from != null && to != null) return `${labels.from} ${eur(from, locale)} · ${labels.to} ${eur(to, locale)}`;
  if (from != null) return `${labels.from} ${eur(from, locale)}`;
  if (to != null) return `${labels.to} ${eur(to, locale)}`;
  return null;
}

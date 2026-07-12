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

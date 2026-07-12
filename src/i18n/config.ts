// Языки интерфейса Domora. Порядок совпадает с меню переключателя.
export const LOCALES = ["en", "ru", "uk", "pl", "es", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const LANG_NAMES: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
  pl: "Polski",
  es: "Español",
  pt: "Português",
};

// Теги для форматирования чисел и валют.
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-IE",
  ru: "ru-RU",
  uk: "uk-UA",
  pl: "pl-PL",
  es: "es-ES",
  pt: "pt-PT",
};

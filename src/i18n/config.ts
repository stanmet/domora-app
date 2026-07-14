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

// Название языка по коду (для пометки автоперевода "Переведено с X").
// Неизвестные коды (DeepL может определить и другие языки) показываются как есть.
const EXTRA_LANG_NAMES: Record<string, string> = {
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  nl: "Nederlands",
  zh: "中文",
  ja: "日本語",
  ar: "العربية",
};
export function langName(code: string): string {
  const c = (code || "").toLowerCase();
  return (LANG_NAMES as Record<string, string>)[c] ?? EXTRA_LANG_NAMES[c] ?? code.toUpperCase();
}

// Теги для форматирования чисел и валют.
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-IE",
  ru: "ru-RU",
  uk: "uk-UA",
  pl: "pl-PL",
  es: "es-ES",
  pt: "pt-PT",
};

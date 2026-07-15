// Автоперевод пользовательских текстов (профиль, услуги, задачи, отклики, чат).
// Тексты хранятся в оригинале; читателю показываются на языке его интерфейса.
// Перевод берётся из кеша в базе (модель Translation), а при промахе - из DeepL.
// Ключ DeepL: переменная окружения DEEPL_API_KEY. Без ключа перевод просто
// отключается: показывается оригинал, приложение работает как обычно.
import { createHash } from "crypto";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/config";

// Коды целевых языков DeepL. DeepL сам определяет язык оригинала.
const DEEPL_TARGET: Record<Locale, string> = {
  en: "EN-GB",
  ru: "RU",
  uk: "UK",
  pl: "PL",
  es: "ES",
  pt: "PT-PT",
};

const DEEPL_ENDPOINT = "https://api-free.deepl.com/v2/translate";

export type Translated = {
  text: string; // текст на языке читателя (или оригинал, если перевод недоступен)
  sourceLang: string; // определённый язык оригинала (lowercase), либо язык интерфейса
  translated: boolean; // true, если текст реально переведён с другого языка
};

function hashOf(text: string, targetLang: Locale): string {
  return createHash("sha256").update(`${targetLang}::${text}`).digest("hex");
}

function original(text: string, targetLang: Locale): Translated {
  return { text, sourceLang: targetLang, translated: false };
}

// Перевод списка текстов на один язык. Дедуплицирует одинаковые строки,
// читает готовые переводы из кеша и добирает недостающие одним запросом к DeepL.
// Возвращает Map: исходный текст -> результат перевода.
export async function translateBatch(
  rawTexts: string[],
  targetLang: Locale,
): Promise<Map<string, Translated>> {
  const result = new Map<string, Translated>();
  const unique = Array.from(new Set(rawTexts.map((s) => (s ?? "").trim()).filter(Boolean)));
  if (unique.length === 0) return result;

  const hashes = unique.map((t) => hashOf(t, targetLang));
  const hashToText = new Map(unique.map((t, i) => [hashes[i], t]));

  // 1. Из кеша базы.
  let cached: { sourceHash: string; sourceLang: string; text: string }[] = [];
  try {
    cached = await prisma.translation.findMany({
      where: { targetLang, sourceHash: { in: hashes } },
      select: { sourceHash: true, sourceLang: true, text: true },
    });
  } catch {
    // База недоступна: работаем без кеша.
  }
  const cachedHashes = new Set<string>();
  for (const row of cached) {
    const src = hashToText.get(row.sourceHash);
    if (!src) continue;
    cachedHashes.add(row.sourceHash);
    result.set(src, { text: row.text, sourceLang: row.sourceLang, translated: row.sourceLang !== targetLang });
  }

  const missing = unique.filter((_, i) => !cachedHashes.has(hashes[i]));
  if (missing.length === 0) return result;

  // 2. Недостающее показываем СРАЗУ в оригинале, чтобы не задерживать рендер
  //    страницы (навигация должна быть мгновенной).
  for (const t of missing) result.set(t, original(t, targetLang));

  // 3. Сам перевод через DeepL выполняем в фоне, после ответа. При следующем
  //    открытии эти тексты уже возьмутся из кеша переведёнными. Так тап по любой
  //    кнопке/ссылке откликается сразу, не дожидаясь сети до DeepL.
  if (process.env.DEEPL_API_KEY) {
    try {
      after(() => translateAndCache(missing, targetLang));
    } catch {
      // after доступен только в контексте запроса: вне его просто пропускаем.
    }
  }

  return result;
}

// Фоновый перевод недостающих строк и запись в кеш (не блокирует рендер).
async function translateAndCache(missing: string[], targetLang: Locale): Promise<void> {
  const key = process.env.DEEPL_API_KEY;
  if (!key || missing.length === 0) return;
  try {
    const params = new URLSearchParams();
    for (const t of missing) params.append("text", t);
    params.append("target_lang", DEEPL_TARGET[targetLang]);
    const res = await fetch(DEEPL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!res.ok) throw new Error(`DeepL ${res.status}`);
    const data = (await res.json()) as { translations: { detected_source_language: string; text: string }[] };
    const translations = data.translations ?? [];

    const toCache: { sourceHash: string; targetLang: string; sourceLang: string; text: string }[] = [];
    missing.forEach((src, i) => {
      const tr = translations[i];
      if (!tr) return;
      const sourceLang = (tr.detected_source_language || targetLang).toLowerCase();
      toCache.push({ sourceHash: hashOf(src, targetLang), targetLang, sourceLang, text: tr.text });
    });
    if (toCache.length) await prisma.translation.createMany({ data: toCache, skipDuplicates: true });
  } catch (e) {
    console.error("DeepL translate failed", e);
  }
}

// Перевод одного текста. Удобная обёртка над translateBatch.
export async function translateText(text: string, targetLang: Locale): Promise<Translated> {
  const clean = (text ?? "").trim();
  if (!clean) return original(clean, targetLang);
  const map = await translateBatch([clean], targetLang);
  return map.get(clean) ?? original(clean, targetLang);
}

// Настоящие фото по теме услуги через Pexels API (бесплатный ключ PEXELS_API_KEY).
// Логика: на каждую тему один раз тянем «пул» из ~30 реальных фото и раздаём их
// ботам детерминированно по seed. Так на всё нужно всего ~18 запросов, а не тысячи.
// Без ключа возвращаем null - вызывающий код показывает тематические плитки.
import { serviceKeyword } from "./photos";

// Тема -> поисковый запрос в Pexels (по-английски, чётко по делу).
const PEXELS_QUERY: Record<string, string> = {
  cooking: "chef cooking food",
  cleaning: "house cleaning",
  handyman: "handyman home repair",
  plumbing: "plumber pipe repair",
  electrician: "electrician wiring",
  massage: "massage therapy spa",
  manicure: "manicure nails",
  makeup: "makeup artist",
  brows: "eyebrows beauty",
  haircut: "hair salon haircut",
  dj: "dj party music",
  photographer: "photographer camera",
  kids: "kids birthday party",
  party: "party celebration decoration",
  gardening: "lawn mowing garden",
  dog: "dog walking pet",
  tutoring: "tutor student studying",
  moving: "movers moving boxes",
  delivery: "courier delivery parcel",
};

const poolCache = new Map<string, string[]>();

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function hasPexels(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

async function fetchPool(keyword: string): Promise<string[]> {
  if (poolCache.has(keyword)) return poolCache.get(keyword) as string[];
  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    poolCache.set(keyword, []);
    return [];
  }
  try {
    const q = PEXELS_QUERY[keyword] ?? keyword;
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=80&orientation=landscape`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) throw new Error(`pexels ${res.status}`);
    const data = (await res.json()) as { photos?: { src?: { large?: string; landscape?: string } }[] };
    const urls = (data.photos ?? [])
      .map((p) => p.src?.large || p.src?.landscape)
      .filter((u): u is string => Boolean(u));
    poolCache.set(keyword, urls);
    return urls;
  } catch (e) {
    console.error("pexels fetch failed", keyword, e);
    poolCache.set(keyword, []);
    return [];
  }
}

// Заранее (параллельно) прогреть пулы для набора тем - чтобы дальше раздавать без задержек.
export async function prefetchPools(keywords: string[]): Promise<void> {
  const unique = Array.from(new Set(keywords));
  await Promise.all(unique.map((k) => fetchPool(k)));
}

// Настоящие фото по теме: массив URL из пула, либо null, если пул пуст (нет ключа
// или Pexels недоступен) - тогда вызывающий код возьмёт тематические плитки.
export async function realPhotos(keyword: string, seed: string, count: number): Promise<string[] | null> {
  const pool = await fetchPool(keyword);
  if (pool.length === 0) return null;
  const base = hashNum(seed);
  return Array.from({ length: Math.max(1, count) }, (_, i) => pool[(base + i) % pool.length]);
}

// Удобный помощник: тема по названию услуги -> её пул прогрет.
export async function prefetchForTitles(items: { title: string; categorySlug: string }[]): Promise<void> {
  await prefetchPools(items.map((it) => serviceKeyword(it.title, it.categorySlug)));
}

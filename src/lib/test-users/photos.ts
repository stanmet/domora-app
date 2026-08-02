// Реалистичные фото и описания для тестовых аккаунтов (ботов).
// Фото - внешние публичные картинки (портреты людей и тематические фото по
// категории). Они загружаются браузером посетителя напрямую, детерминированы
// по seed, поэтому у каждого бота стабильный набор изображений.

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Портрет для аватара. randomuser.me отдаёт реалистичные фото людей (men/women, 0-99).
export function portraitUrl(seed: string): string {
  const h = hashNum(seed);
  const gender = h % 2 === 0 ? "men" : "women";
  const n = h % 100;
  return `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;
}

// Ключевые слова тем по категориям - чтобы фото услуги было по делу.
const CAT_KEYWORDS: Record<string, string[]> = {
  chef: ["chef", "cooking", "homemade,food"],
  clean: ["cleaning", "housekeeping", "clean,home"],
  handy: ["handyman", "tools", "furniture,assembly"],
  massage: ["massage", "spa", "wellness"],
  beauty: ["manicure", "makeup", "hairdresser"],
  events: ["party,dj", "photographer", "celebration"],
  other: ["gardening", "tutoring", "dog,walking"],
};

// Набор тематических фото для услуги/портфолио. loremflickr отдаёт фото по
// ключевым словам; параметр lock фиксирует конкретный снимок (стабильность).
export function categoryPhotos(slug: string, seed: string, count: number): string[] {
  const keys = CAT_KEYWORDS[slug] ?? CAT_KEYWORDS.other;
  const base = hashNum(seed);
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const kw = keys[i % keys.length];
    const lock = (base + i * 97) % 100000;
    return `https://loremflickr.com/800/600/${kw}?lock=${lock}`;
  });
}

// Короткое реалистичное описание услуги. Язык - ru или en (остальные показываются
// через автоперевод пользовательского контента на язык посетителя).
export function listingBlurb(profession: string, title: string, city: string, lang: string): string {
  if (lang === "ru" || lang === "uk") {
    return `${profession} в ${city}. ${title}. Работаю аккуратно и в срок, беру свой инструмент и материалы под задачу. Напишите в чат - обсудим детали, объём и удобное время.`;
  }
  return `${profession} in ${city}. ${title}. Reliable and on time, I bring my own tools and materials. Message me in chat to agree the details, scope and a convenient time.`;
}

// Фото для тестовых аккаунтов (ботов).
// - Аватар профиля: настоящий портрет человека (randomuser.me).
// - Фото услуг и портфолио: чистые ТЕМАТИЧЕСКИЕ плитки (градиент + крупный значок
//   услуги), нарисованные прямо в коде как data-URI. Они всегда соответствуют
//   услуге, всегда загружаются и никогда не бывают «не по теме» - в отличие от
//   случайных фото-сервисов. Тема определяется по названию услуги.

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

// Тема (ключ) по названию услуги. Порядок важен: узкие темы - раньше общих.
const TITLE_KEYWORDS: [RegExp, string][] = [
  [/газон|сад(?!ик)|двор|клумб|ландшафт|полив|растен/i, "gardening"],
  [/собак|выгул|питом|кошк|груминг/i, "dog"],
  [/курьер|доставк|посылк/i, "delivery"],
  [/переезд|перевоз|грузчик/i, "moving"],
  [/репетит|английск|математ|урок|обучен|\bязык/i, "tutoring"],
  [/маникюр|ногт|педикюр/i, "manicure"],
  [/макияж|визаж/i, "makeup"],
  [/бров|ресниц/i, "brows"],
  [/стрижк|укладк|парикмах|волос|причёск|причес/i, "haircut"],
  [/массаж/i, "massage"],
  [/сантех|смесител|кран|труб|унитаз|засор/i, "plumbing"],
  [/электрик|проводк|розетк|светильник/i, "electrician"],
  [/мебел|сборк|полк|картин|телевизор|ремонт|навес|установк|карниз/i, "handyman"],
  [/диджей|\bdj\b/i, "dj"],
  [/фотограф|фотосъ|съёмк|съемк/i, "photographer"],
  [/аниматор|детск/i, "kids"],
  [/ведущ|юбилей|праздник|вечеринк|торжеств|свадьб/i, "party"],
  [/уборк|убрать|окон|окна|мытьё|чист|клинин/i, "cleaning"],
  [/повар|ужин|меню|стейк|паст[аы]|готов|блюд|кейтеринг|\bеда|гриль|выпечк/i, "cooking"],
];
const CATEGORY_FALLBACK: Record<string, string> = {
  chef: "cooking",
  clean: "cleaning",
  handy: "handyman",
  plumbing: "plumbing",
  electrical: "electrician",
  gardening: "gardening",
  beauty: "haircut",
  petcare: "dog",
  moving: "moving",
  tutoring: "tutoring",
  massage: "massage",
  events: "party",
  other: "handyman",
};

export function serviceKeyword(title: string, categorySlug: string): string {
  for (const [re, kw] of TITLE_KEYWORDS) if (re.test(title)) return kw;
  return CATEGORY_FALLBACK[categorySlug] ?? "handyman";
}

// Значок и подпись темы для плитки.
const THEME: Record<string, { emoji: string; label: string }> = {
  cooking: { emoji: "🍳", label: "Повар" },
  cleaning: { emoji: "🧹", label: "Уборка" },
  handyman: { emoji: "🛠️", label: "Мастер" },
  plumbing: { emoji: "🚿", label: "Сантехника" },
  electrician: { emoji: "💡", label: "Электрика" },
  massage: { emoji: "💆", label: "Массаж" },
  manicure: { emoji: "💅", label: "Маникюр" },
  makeup: { emoji: "💄", label: "Макияж" },
  brows: { emoji: "✨", label: "Брови" },
  haircut: { emoji: "💇", label: "Стрижка" },
  dj: { emoji: "🎧", label: "Диджей" },
  photographer: { emoji: "📷", label: "Фото" },
  kids: { emoji: "🎈", label: "Праздник" },
  party: { emoji: "🎉", label: "Праздник" },
  gardening: { emoji: "🌿", label: "Сад" },
  dog: { emoji: "🐕", label: "Питомцы" },
  tutoring: { emoji: "📚", label: "Обучение" },
  moving: { emoji: "📦", label: "Переезд" },
  delivery: { emoji: "🛵", label: "Доставка" },
};

// Пары градиентов - мягкие, в тон дизайну.
const GRADS: [string, string][] = [
  ["#EAC27E", "#D98E4A"],
  ["#9FC495", "#5E9A6B"],
  ["#C9B79C", "#9C8666"],
  ["#9DC3C2", "#5E9491"],
  ["#E4A79A", "#C97A66"],
  ["#B7A7D6", "#8A73B8"],
  ["#E7C0A0", "#C98F63"],
  ["#A9C6A0", "#6E9E72"],
];

function themedTile(keyword: string, variant: number): string {
  const t = THEME[keyword] ?? { emoji: "🏠", label: "Услуга" };
  const g = GRADS[variant % GRADS.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${g[0]}"/><stop offset="1" stop-color="${g[1]}"/>` +
    `</linearGradient></defs>` +
    `<rect width="800" height="600" fill="url(#g)"/>` +
    `<text x="50%" y="46%" text-anchor="middle" dominant-baseline="central" font-size="230">${t.emoji}</text>` +
    `<text x="50%" y="80%" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="46" font-weight="700" fill="#ffffff" fill-opacity="0.92">${t.label}</text>` +
    `</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
}

// Набор тематических плиток для услуги/портфолио (разные градиенты).
export function servicePhotos(keyword: string, seed: string, count: number): string[] {
  const base = hashNum(seed);
  return Array.from({ length: Math.max(1, count) }, (_, i) => themedTile(keyword, base + i));
}

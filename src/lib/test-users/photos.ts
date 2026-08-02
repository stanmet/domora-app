// Реалистичные фото для тестовых аккаунтов (ботов).
// - Аватар профиля: портрет человека (randomuser.me).
// - Фото услуг и портфолио: снимки ПО ТЕМЕ конкретной услуги. Тему определяем
//   по названию услуги (стрижка -> haircut, газон -> lawn и т.п.), а не по общей
//   категории, поэтому картинка соответствует именно этой работе.
// Все картинки грузит браузер посетителя напрямую; детерминированы по seed.

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

// Определение темы (англ. ключевое слово для фото) по названию услуги. Порядок
// важен: более узкие темы проверяем раньше (например «газон» до «стрижки»).
const TITLE_KEYWORDS: [RegExp, string][] = [
  [/газон|сад(?!ик)|двор|клумб|ландшафт/i, "gardening"],
  [/собак|выгул|питом|кошк|zоо|груминг/i, "dog"],
  [/переезд|перевоз|грузчик/i, "moving"],
  [/репетит|английск|математ|урок|обучен|язык/i, "tutoring"],
  [/маникюр|ногт|педикюр/i, "manicure"],
  [/макияж|визаж/i, "makeup"],
  [/бров|ресниц/i, "eyebrows"],
  [/стрижк|укладк|парикмах|волос|причёск|причес/i, "haircut"],
  [/массаж/i, "massage"],
  [/сантех|смесител|кран|труб|унитаз|засор/i, "plumbing"],
  [/электрик|проводк|розетк|светильник/i, "electrician"],
  [/мебел|сборк|полк|картин|телевизор|ремонт|навес|установк|карниз/i, "handyman"],
  [/диджей|\bdj\b/i, "dj"],
  [/фотограф|фотосъ|съёмк|съемк/i, "photographer"],
  [/аниматор|детск/i, "party"],
  [/ведущ|юбилей|праздник|вечеринк|торжеств|свадьб/i, "party"],
  [/уборк|убрать|окон|окна|мытьё|чист|клинин/i, "cleaning"],
  [/повар|ужин|меню|стейк|паст[аы]|готов|блюд|кейтеринг|еда|гриль|выпечк/i, "cooking"],
];

// Запасная тема по категории, если по названию ничего не нашли.
const CATEGORY_FALLBACK: Record<string, string> = {
  chef: "cooking",
  clean: "cleaning",
  handy: "handyman",
  massage: "massage",
  beauty: "haircut",
  events: "party",
  other: "gardening",
};

export function serviceKeyword(title: string, categorySlug: string): string {
  for (const [re, kw] of TITLE_KEYWORDS) if (re.test(title)) return kw;
  return CATEGORY_FALLBACK[categorySlug] ?? "handyman";
}

// Набор фото по теме. loremflickr отдаёт фото по ключевому слову; lock фиксирует
// конкретный снимок (стабильность и разные фото у разных ботов).
export function servicePhotos(keyword: string, seed: string, count: number): string[] {
  const base = hashNum(seed);
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const lock = (base + i * 97) % 100000;
    return `https://loremflickr.com/800/600/${keyword}?lock=${lock}`;
  });
}

// Богатый генератор анкет для ботов: разнообразные, непохожие друг на друга
// биографии и описания услуг. Собираются из независимых наборов фраз по seed,
// что даёт десятки тысяч уникальных комбинаций. Тексты на русском - язык
// оригинала (bioLang="ru"); на странице они автоматически переводятся на язык
// посетителя. Детерминировано по seed: у бота стабильная анкета.
import { CATEGORY_PACKS } from "./personas";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// --- БИО исполнителя ---
const B_INTRO = [
  "Профессиональный {prof} из города {city}.",
  "Меня зовут по-простому, а по делу я {profLower} - работаю в {city} и рядом.",
  "{prof}. Живу и работаю в {city}, выезжаю по всему региону.",
  "Здравствуйте! Я {profLower}, помогаю жителям {city} уже не первый год.",
  "{prof} с любовью к своему делу. База - {city}.",
  "Частный специалист: {profLower}. Район работы - {city} и пригороды.",
  "Опытный {prof}. Беру заказы по {city} и области.",
  "{prof}, для меня это не подработка, а профессия. Работаю в {city}.",
];
const B_EXP = [
  "Опыт - {years} лет.",
  "В профессии больше {years} лет.",
  "За {years} лет выполнил сотни заказов разной сложности.",
  "{years} лет практики и довольных клиентов.",
  "Уже {years} лет делаю эту работу и продолжаю учиться новому.",
  "Стаж {years} лет: за это время повидал почти всё.",
];
const B_SPEC = [
  "Специализируюсь на: {skills}.",
  "Особенно хорошо получается {skill1} и {skill2}.",
  "Мои сильные стороны - {skills}.",
  "Чаще всего заказывают {skills}.",
  "Люблю задачи, где нужен {skill1}, но берусь и за {skill2}.",
];
const B_APPROACH = [
  "Работаю аккуратно, чисто и без спешки.",
  "Ценю пунктуальность и честную цену без скрытых доплат.",
  "К каждой задаче подхожу индивидуально и всегда на связи.",
  "Сначала обсуждаем детали, потом приступаю - никаких сюрпризов.",
  "Спокойно объясню, что и зачем делаю, отвечу на все вопросы.",
  "Берусь и за мелочь, и за большой объём - подстроюсь под вас.",
];
const B_CTA = [
  "Даю гарантию на результат.",
  "Свой инструмент и материалы под задачу.",
  "Напишите в чат - отвечу быстро и подскажу по цене.",
  "Гибкий график, можно вечером и в выходные.",
  "Работаю официально, по договорённости о цене заранее.",
  "Дорожу отзывами, поэтому делаю на совесть.",
];

export function richBio(opts: { profession: string; city: string; years: number; categorySlug: string; seed: string }): string {
  const h = hash(opts.seed);
  const pack = CATEGORY_PACKS[opts.categorySlug] ?? CATEGORY_PACKS.other;
  const sk = pack.skills;
  const s1 = pick(sk, h >> 2);
  const s2 = pick(sk, (h >> 5) + 1);
  const skills = Array.from(new Set([s1, s2, pick(sk, (h >> 8) + 2)])).slice(0, 3).map(lower).join(", ");
  const fill = (t: string) =>
    t
      .replaceAll("{prof}", opts.profession)
      .replaceAll("{profLower}", lower(opts.profession))
      .replaceAll("{city}", opts.city)
      .replaceAll("{years}", String(opts.years))
      .replaceAll("{skills}", skills)
      .replaceAll("{skill1}", lower(s1))
      .replaceAll("{skill2}", lower(s2));
  return [
    fill(pick(B_INTRO, h)),
    fill(pick(B_EXP, h >> 3)),
    fill(pick(B_SPEC, h >> 6)),
    fill(pick(B_APPROACH, h >> 9)),
    fill(pick(B_CTA, h >> 12)),
  ].join(" ");
}

// --- Описание услуги ---
const D_OPEN = [
  "{title}.",
  "Предлагаю услугу: {title}.",
  "{title} - быстро и качественно.",
  "Возьмусь за задачу: {title}.",
];
const D_BODY = [
  "Работаю в {city} и ближайших районах, выезжаю на дом.",
  "Приеду в удобное время, в том числе вечером и в выходные.",
  "Всё необходимое привожу с собой, от вас - только доступ к месту.",
  "Заранее оценю объём и назову честную цену без накруток.",
  "Аккуратно, с уважением к вашему дому и времени.",
];
const D_END = [
  "Напишите в чат - согласуем детали и время.",
  "Готов начать в ближайшие дни.",
  "Есть вопросы по цене - спрашивайте, всё расскажу.",
  "Дорожу репутацией, поэтому делаю на совесть.",
];

export function richListingDesc(opts: { title: string; city: string; seed: string; index: number }): string {
  const h = hash(`${opts.seed}:${opts.index}`);
  const fill = (t: string) => t.replaceAll("{title}", opts.title).replaceAll("{city}", opts.city);
  return [fill(pick(D_OPEN, h)), fill(pick(D_BODY, h >> 4)), fill(pick(D_END, h >> 8))].join(" ");
}

// Правдоподобные «живые» показатели профиля по seed: опыт, рейтинг, число работ,
// радиус выезда, скорость ответа. Чтобы боты не были все «новыми» и одинаковыми.
export function richStats(seed: string): {
  years: number;
  jobsCount: number;
  rating: number;
  travelRadiusKm: number;
  responseMinutes: number;
  acceptanceRate: number;
} {
  const h = hash(seed);
  const years = 2 + (h % 16); // 2..17
  const jobsCount = 4 + ((h >> 3) % 160); // 4..163
  const rating = Math.round((4.3 + ((h >> 6) % 8) * 0.1) * 100) / 100; // 4.3..5.0
  const travelRadiusKm = [10, 15, 20, 25, 30, 40, 50][(h >> 9) % 7];
  const responseMinutes = [5, 10, 15, 20, 30, 45, 60][(h >> 11) % 7];
  const acceptanceRate = Math.round((0.85 + ((h >> 13) % 15) * 0.01) * 1000) / 1000; // 0.85..0.99
  return { years, jobsCount, rating, travelRadiusKm, responseMinutes, acceptanceRate };
}

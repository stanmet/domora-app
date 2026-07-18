// Локальный генератор синтетических персон для тестовых аккаунтов.
// Работает без внешних сервисов и служит запасным вариантом, если AI-ключ
// не задан. Разнообразие имён, городов, профессий, стилей биографий и цен
// подобрано так, чтобы распределение профессий и текстов выглядело реально
// и без повторов (см. dedupe в index.ts).

export type PersonaRole = "provider" | "client";

export interface GeneratedPersona {
  firstName: string;
  lastName: string;
  city: string;
  languages: string[]; // коды языков интерфейса: en ru uk pl es pt
  bioLang: string;
  // Поля исполнителя:
  profession?: string;
  bio?: string;
  experienceYears?: number;
  skills?: string[];
  listingTitle?: string;
  priceCents?: number;
  // Поля клиента (задача на доске):
  taskTitle?: string;
  taskDescription?: string;
  budgetFromCents?: number;
  budgetToCents?: number;
}

// Ирландские города, где работает маркетплейс.
export const TEST_CITIES = ["Dublin", "Cork", "Galway", "Limerick", "Waterford", "Kilkenny", "Drogheda", "Dundalk"];

// Имена разных культур - Ирландия многонациональна, это делает выборку реальной.
const FIRST_NAMES = [
  "Aoife", "Sean", "Ciara", "Cian", "Niamh", "Liam", "Saoirse", "Conor", "Roisin", "Fionn",
  "Marta", "Piotr", "Kasia", "Tomasz", "Agnieszka", "Michal",
  "Oleksandr", "Kateryna", "Dmytro", "Iryna", "Andriy", "Olena",
  "Lucia", "Diego", "Sofia", "Mateo", "Elena", "Pablo",
  "Ana", "Joao", "Beatriz", "Rafael", "Mariana", "Tiago",
  "Amara", "Kwame", "Chidi", "Ngozi", "Rahul", "Priya", "Wei", "Mei",
];

const LAST_NAMES = [
  "Byrne", "Murphy", "O'Brien", "Kelly", "Walsh", "Ryan", "Doyle", "McCarthy", "Gallagher", "Nolan",
  "Kowalska", "Nowak", "Wojcik", "Kaminski", "Lewandowski",
  "Shevchenko", "Bondarenko", "Tkachenko", "Kovalenko", "Melnyk",
  "Garcia", "Rodriguez", "Fernandez", "Lopez", "Santos", "Oliveira", "Costa", "Almeida",
  "Okafor", "Mensah", "Sharma", "Patel", "Chen", "Nguyen",
];

const LANG_POOL = ["en", "ru", "uk", "pl", "es", "pt"];

// Профессии, названия услуг, навыки и ценовые вилки по категориям.
// unit определяется категорией на стороне вызывающего кода (Category.unitDefault).
interface CategoryPack {
  professions: string[];
  titles: string[];
  skills: string[];
  // цена за единицу в центах: [min, max]
  price: [number, number];
  // бюджет задачи клиента в центах: [min, max]
  budget: [number, number];
  tasks: string[];
}

export const CATEGORY_PACKS: Record<string, CategoryPack> = {
  chef: {
    professions: ["Повар на дом", "Private chef", "Кейтеринг", "Meal prep chef"],
    titles: [
      "Ужин на дом для компании до 8 человек",
      "Домашний повар на семейный праздник",
      "Meal prep на неделю: 5 обедов",
      "Итальянский ужин с пастой ручной работы",
      "Стейки и гриль на террасе",
      "Веганское меню на дом",
    ],
    skills: ["Итальянская кухня", "Стейки", "Выпечка", "Веганское меню", "Meal prep", "Сервировка"],
    price: [3000, 6500],
    budget: [4000, 15000],
    tasks: ["Нужен повар на день рождения", "Ужин на двоих дома", "Готовка на неделю вперёд"],
  },
  clean: {
    professions: ["Клинер", "Cleaner", "Уборка помещений"],
    titles: [
      "Генеральная уборка квартиры",
      "Регулярная уборка раз в неделю",
      "Уборка после ремонта",
      "Мытьё окон и балкона",
      "Уборка офиса вечером",
    ],
    skills: ["Генеральная уборка", "Мытьё окон", "Химчистка", "Уборка после ремонта", "Эко-средства"],
    price: [180, 350],
    budget: [5000, 20000],
    tasks: ["Убрать квартиру после переезда", "Регулярная уборка студии", "Помыть окна в доме"],
  },
  handy: {
    professions: ["Мастер на час", "Handyman", "Сборщик мебели", "Электрик"],
    titles: [
      "Мелкий ремонт и сборка мебели",
      "Установка полок и картин",
      "Замена смесителя и мелкая сантехника",
      "Сборка кухни IKEA",
      "Навеска телевизора на стену",
    ],
    skills: ["Сборка мебели", "Сантехника", "Электрика", "Сверление", "Установка техники"],
    price: [2500, 5500],
    budget: [3000, 12000],
    tasks: ["Собрать шкаф", "Повесить телевизор", "Починить кран на кухне"],
  },
  massage: {
    professions: ["Массажист", "Massage therapist", "Мастер массажа"],
    titles: [
      "Расслабляющий массаж на дому",
      "Спортивный массаж, 60 минут",
      "Массаж спины и шеи",
      "Лимфодренажный массаж",
    ],
    skills: ["Расслабляющий массаж", "Спортивный массаж", "Лимфодренаж", "Массаж стоп"],
    price: [4000, 8000],
    budget: [4000, 9000],
    tasks: ["Массаж спины после работы", "Спортивный массаж перед забегом"],
  },
  beauty: {
    professions: ["Мастер маникюра", "Визажист", "Beauty at home", "Парикмахер"],
    titles: [
      "Маникюр и покрытие гель-лаком",
      "Вечерний макияж на дому",
      "Женская стрижка и укладка",
      "Оформление бровей",
    ],
    skills: ["Маникюр", "Педикюр", "Макияж", "Стрижка", "Брови", "Укладка"],
    price: [2500, 6000],
    budget: [2500, 8000],
    tasks: ["Маникюр перед праздником", "Макияж на свадьбу", "Стрижка дома"],
  },
  events: {
    professions: ["Диджей", "Аниматор", "Фотограф", "Организатор праздников"],
    titles: [
      "Диджей на вечеринку",
      "Аниматор на детский праздник",
      "Фотограф на семейное торжество",
      "Ведущий на юбилей",
    ],
    skills: ["Диджеинг", "Ведущий", "Фотосъёмка", "Аниматор", "Свет и звук"],
    price: [8000, 25000],
    budget: [10000, 40000],
    tasks: ["Диджей на день рождения", "Фотограф на крестины", "Аниматор на 5 лет"],
  },
  other: {
    professions: ["Репетитор", "Догситтер", "Курьер", "Садовник"],
    titles: [
      "Выгул и присмотр за собакой",
      "Репетитор английского на дому",
      "Стрижка газона и уход за садом",
      "Помощь с переездом",
    ],
    skills: ["Уход за питомцами", "Английский", "Садовые работы", "Переезды"],
    price: [1500, 5000],
    budget: [2000, 10000],
    tasks: ["Выгулять собаку", "Позаниматься английским с ребёнком", "Постричь газон"],
  },
};

// Стили биографий - разные, чтобы тексты не были однотипными.
const BIO_STYLES: ((p: { prof: string; years: number; city: string; skills: string[] }) => string)[] = [
  ({ prof, years, city }) => `${prof} с опытом ${years} лет. Работаю по ${city} и пригородам, берусь за задачи любой сложности.`,
  ({ prof, skills }) => `Специализация: ${skills.slice(0, 2).join(", ").toLowerCase()}. Аккуратно, в срок и с гарантией результата. ${prof}.`,
  ({ years, city }) => `Более ${years} лет помогаю жителям ${city}. Ценю пунктуальность и честную цену без скрытых доплат.`,
  ({ prof, skills }) => `${prof}. Умею: ${skills.slice(0, 3).join(", ").toLowerCase()}. Свой инструмент и материалы под задачу.`,
  ({ years }) => `Начинал(а) как любитель, а теперь это моё дело ${years} лет. Отзывчивый подход и внимание к деталям.`,
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Генерирует count персон локально. seed делает результат воспроизводимым,
// index-соль внутри — уникальными (без повторяющихся био и имён подряд).
export function localPersonas(
  count: number,
  opts: { role: PersonaRole; categorySlug: string; city?: string; seed?: number },
): GeneratedPersona[] {
  const rnd = mulberry32(opts.seed ?? Date.now());
  const pick = <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const pack = CATEGORY_PACKS[opts.categorySlug] ?? CATEGORY_PACKS.other;
  const out: GeneratedPersona[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const city = opts.city || pick(TEST_CITIES);
    const bioLang = pick(LANG_POOL);
    const langs = Array.from(new Set(["en", bioLang, pick(LANG_POOL)])).slice(0, 3);

    if (opts.role === "provider") {
      const profession = pick(pack.professions);
      const years = 1 + Math.floor(rnd() * 15);
      const skills = shuffle(pack.skills, rnd).slice(0, 3 + Math.floor(rnd() * 2));
      const bioFn = BIO_STYLES[(i + Math.floor(rnd() * BIO_STYLES.length)) % BIO_STYLES.length];
      const priceCents = pack.price[0] + Math.floor(rnd() * (pack.price[1] - pack.price[0]));
      out.push({
        firstName,
        lastName,
        city,
        languages: langs,
        bioLang,
        profession,
        experienceYears: years,
        skills,
        bio: bioFn({ prof: profession, years, city, skills }),
        listingTitle: pick(pack.titles),
        priceCents: Math.round(priceCents / 50) * 50,
      });
    } else {
      const from = pack.budget[0] + Math.floor(rnd() * (pack.budget[1] - pack.budget[0]) * 0.4);
      const to = from + 2000 + Math.floor(rnd() * (pack.budget[1] - pack.budget[0]) * 0.6);
      out.push({
        firstName,
        lastName,
        city,
        languages: langs,
        bioLang,
        taskTitle: pick(pack.tasks),
        taskDescription: `${pick(pack.tasks)}. Удобно во второй половине дня, оплата на платформе.`,
        budgetFromCents: Math.round(from / 100) * 100,
        budgetToCents: Math.round(to / 100) * 100,
      });
    }
  }
  return out;
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
    professions: ["Private chef", "Home cook", "Caterer", "Meal prep chef"],
    titles: [
      "Dinner at home for up to 8 guests",
      "Home chef for a family celebration",
      "Weekly meal prep: 5 dinners",
      "Italian dinner with handmade pasta",
      "Steaks and grill on the terrace",
      "Vegan menu at home",
    ],
    skills: ["Italian cuisine", "Steaks", "Baking", "Vegan menu", "Meal prep", "Plating"],
    price: [3000, 6500],
    budget: [4000, 15000],
    tasks: ["Need a chef for a birthday", "Dinner for two at home", "Cook meals for the week ahead"],
  },
  clean: {
    professions: ["Cleaner", "House cleaner", "Domestic cleaning"],
    titles: [
      "Deep clean of the apartment",
      "Weekly regular cleaning",
      "After-builders cleaning",
      "Window and balcony cleaning",
      "Evening office cleaning",
    ],
    skills: ["Deep cleaning", "Window cleaning", "Upholstery cleaning", "After-builders cleaning", "Eco products"],
    price: [180, 350],
    budget: [5000, 20000],
    tasks: ["Clean the flat after moving out", "Regular studio cleaning", "Wash the windows in the house"],
  },
  handy: {
    professions: ["Handyman", "Odd-job man", "Furniture assembler", "Fitter"],
    titles: [
      "Small repairs and furniture assembly",
      "Fitting shelves and pictures",
      "Tap replacement and minor plumbing",
      "IKEA kitchen assembly",
      "TV wall mounting",
    ],
    skills: ["Furniture assembly", "Basic plumbing", "Basic electrics", "Drilling", "Appliance fitting"],
    price: [2500, 5500],
    budget: [3000, 12000],
    tasks: ["Assemble a wardrobe", "Mount a TV on the wall", "Fix a kitchen tap"],
  },
  plumbing: {
    professions: ["Plumber", "Plumbing specialist"],
    titles: [
      "Tap replacement",
      "Leak repair",
      "Toilet installation",
      "Drain unblocking",
      "Washing machine connection",
    ],
    skills: ["Taps", "Leak repair", "Sanitaryware fitting", "Clearing blockages"],
    price: [3000, 7000],
    budget: [4000, 15000],
    tasks: ["Kitchen tap is leaking", "Blocked sink", "Install a toilet"],
  },
  electrical: {
    professions: ["Electrician", "Master electrician"],
    titles: [
      "Sockets and switches replacement",
      "Light fitting installation",
      "Fault finding and repair",
      "Wiring installation",
      "Hob connection",
    ],
    skills: ["Sockets and switches", "Lighting", "Wiring", "Fault finding"],
    price: [3000, 7000],
    budget: [4000, 15000],
    tasks: ["A socket isn't working", "Hang and wire a light fitting", "Check the wiring"],
  },
  gardening: {
    professions: ["Gardener", "Garden specialist"],
    titles: [
      "Lawn mowing",
      "Garden and flowerbed care",
      "Hedge and tree trimming",
      "Leaf clearing",
      "Planting",
    ],
    skills: ["Lawn mowing", "Pruning", "Flowerbed care", "Garden clearing"],
    price: [1800, 5000],
    budget: [3000, 12000],
    tasks: ["Mow the lawn", "Clear leaves in the garden", "Trim the hedges"],
  },
  beauty: {
    professions: ["Nail technician", "Makeup artist", "Beauty at home", "Hairdresser"],
    titles: [
      "Manicure and gel polish",
      "Evening makeup at home",
      "Women's cut and blow-dry",
      "Eyebrow shaping",
    ],
    skills: ["Manicure", "Pedicure", "Makeup", "Haircut", "Brows", "Styling"],
    price: [2500, 6000],
    budget: [2500, 8000],
    tasks: ["Manicure before a party", "Wedding makeup", "Haircut at home"],
  },
  petcare: {
    professions: ["Dog sitter", "Pet sitter", "Pet care specialist", "Groomer"],
    titles: [
      "Dog walking",
      "Pet sitting",
      "Dog grooming",
      "Cat sitting",
    ],
    skills: ["Walking", "Pet sitting", "Grooming", "Feeding"],
    price: [1500, 4000],
    budget: [2000, 9000],
    tasks: ["Walk the dog", "Mind the cat over the weekend", "Wash and trim the dog"],
  },
  moving: {
    professions: ["Mover", "Removals service", "Van driver"],
    titles: [
      "House move help",
      "Furniture transport",
      "Movers by the hour",
      "Old furniture and junk removal",
    ],
    skills: ["Removals", "Loading", "Furniture transport", "Junk removal"],
    price: [3000, 8000],
    budget: [5000, 25000],
    tasks: ["Move belongings to a new flat", "Help carry a sofa", "Take away old furniture"],
  },
  tutoring: {
    professions: ["Tutor", "Teacher"],
    titles: [
      "English tutor",
      "Maths help",
      "Exam preparation",
      "Lessons for school kids",
      "Conversational English",
    ],
    skills: ["English", "Maths", "Exam prep", "Working with children"],
    price: [2000, 5000],
    budget: [3000, 12000],
    tasks: ["Help my child with English", "Help with maths", "Prepare for an exam"],
  },
  massage: {
    professions: ["Massage therapist", "Massage specialist"],
    titles: [
      "Relaxing massage at home",
      "Sports massage, 60 minutes",
      "Back and neck massage",
      "Lymphatic drainage massage",
    ],
    skills: ["Relaxing massage", "Sports massage", "Lymphatic drainage", "Foot massage"],
    price: [4000, 8000],
    budget: [4000, 9000],
    tasks: ["Back massage after work", "Sports massage before a race"],
  },
  events: {
    professions: ["DJ", "Entertainer", "Photographer", "Event host"],
    titles: [
      "DJ for a party",
      "Entertainer for a kids party",
      "Photographer for a family celebration",
      "Host for an anniversary",
    ],
    skills: ["DJing", "Hosting", "Photography", "Kids entertainment", "Sound and light"],
    price: [8000, 25000],
    budget: [10000, 40000],
    tasks: ["DJ for a birthday", "Photographer for a christening", "Entertainer for a 5th birthday"],
  },
  other: {
    professions: ["Home helper", "Courier", "General worker"],
    titles: [
      "Various household tasks",
      "Help around the house",
      "Courier delivery",
      "Small errands",
    ],
    skills: ["Help around the house", "Delivery", "Small repairs", "Errands"],
    price: [1500, 5000],
    budget: [2000, 10000],
    tasks: ["Help around the house", "Deliver a parcel across town", "Various small errands"],
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
  opts: { role: PersonaRole; categorySlug: string; city?: string; lang?: string; seed?: number },
): GeneratedPersona[] {
  const rnd = mulberry32(opts.seed ?? Date.now());
  const pick = <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const pack = CATEGORY_PACKS[opts.categorySlug] ?? CATEGORY_PACKS.other;
  const out: GeneratedPersona[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const city = opts.city || pick(TEST_CITIES);
    // Язык текстов: заданный принудительно или случайный из набора интерфейса.
    const bioLang = opts.lang && LANG_POOL.includes(opts.lang) ? opts.lang : pick(LANG_POOL);
    const langs = Array.from(new Set([bioLang, "en", pick(LANG_POOL)])).slice(0, 3);

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
        taskDescription: `${pick(pack.tasks)}. Afternoons work best. Message me with your price.`,
        budgetFromCents: Math.round(from / 100) * 100,
        budgetToCents: Math.round(to / 100) * 100,
      });
    }
  }
  return out;
}

// Несколько разных названий услуг для одного исполнителя (когда на профиль
// нужно больше одной плашки). Берём из набора категории без повторов.
export function pickListingTitles(categorySlug: string, n: number, seed?: number): string[] {
  const pack = CATEGORY_PACKS[categorySlug] ?? CATEGORY_PACKS.other;
  const rnd = mulberry32((seed ?? Date.now()) ^ 0x9e3779b9);
  return shuffle(pack.titles, rnd).slice(0, Math.max(1, Math.min(n, pack.titles.length)));
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

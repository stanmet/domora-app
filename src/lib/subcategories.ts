// Дерево подкатегорий услуг (из каталога Domora v3, рынок Ирландии).
// Данные засеиваются идемпотентно (upsert по slug) при первом обращении.
import { prisma } from "@/lib/prisma";

export type SubcatSeed = {
  slug: string;
  categorySlug: string;
  nameEn: string;
  nameRu: string;
};

// Порядок в массиве задаёт порядок вывода внутри категории.
export const SUBCATEGORIES: SubcatSeed[] = [
  // Кулинария / шеф
  { slug: "chef-dining", categorySlug: "chef", nameEn: "Private chef dining", nameRu: "Частный шеф: обеды и ужины" },
  { slug: "chef-celebrations", categorySlug: "chef", nameEn: "Parties & celebrations", nameRu: "Праздники и торжества" },
  { slug: "chef-workshops", categorySlug: "chef", nameEn: "Cooking workshops & BBQ", nameRu: "Мастер-классы и барбекю" },
  { slug: "chef-mealprep", categorySlug: "chef", nameEn: "Weekly meal prep", nameRu: "Заготовка еды на неделю" },

  // Ремонт / мастер
  { slug: "handy-furniture", categorySlug: "handy", nameEn: "Furniture assembly & mounting", nameRu: "Сборка мебели и монтаж" },
  { slug: "handy-painting", categorySlug: "handy", nameEn: "Painting & decorating", nameRu: "Малярные работы и декор" },
  { slug: "handy-repairs", categorySlug: "handy", nameEn: "Home repairs & carpentry", nameRu: "Ремонт и плотницкие работы" },
  { slug: "handy-electrical", categorySlug: "handy", nameEn: "Electrical help (RECI)", nameRu: "Электрика (RECI)" },
  { slug: "handy-gas", categorySlug: "handy", nameEn: "Gas works (RGII)", nameRu: "Газовые работы (RGII)" },
  { slug: "handy-plumbing", categorySlug: "handy", nameEn: "Plumbing help", nameRu: "Сантехника" },
  { slug: "handy-appliance", categorySlug: "handy", nameEn: "Appliance installation", nameRu: "Установка техники" },
  { slug: "handy-flooring", categorySlug: "handy", nameEn: "Flooring & tiling", nameRu: "Полы и плитка" },

  // Клининг / сад / улица
  { slug: "clean-house", categorySlug: "clean", nameEn: "House cleaning", nameRu: "Уборка дома" },
  { slug: "clean-endtenancy", categorySlug: "clean", nameEn: "End-of-tenancy cleaning", nameRu: "Уборка при выезде" },
  { slug: "clean-garden", categorySlug: "clean", nameEn: "Gardening & lawn care", nameRu: "Сад и уход за газоном" },
  { slug: "clean-pressure", categorySlug: "clean", nameEn: "Pressure washing", nameRu: "Мойка под давлением" },

  // Массаж
  { slug: "massage-relax", categorySlug: "massage", nameEn: "Relaxing & Swedish massage", nameRu: "Расслабляющий массаж" },
  { slug: "massage-deep", categorySlug: "massage", nameEn: "Deep tissue & sports", nameRu: "Глубокий и спортивный" },
  { slug: "massage-therapy", categorySlug: "massage", nameEn: "Therapeutic & lymphatic", nameRu: "Терапевтический массаж" },

  // Красота / велнес
  { slug: "beauty-hair", categorySlug: "beauty", nameEn: "Hair & styling", nameRu: "Волосы и укладка" },
  { slug: "beauty-nails", categorySlug: "beauty", nameEn: "Nails", nameRu: "Маникюр и педикюр" },
  { slug: "beauty-makeup", categorySlug: "beauty", nameEn: "Makeup", nameRu: "Макияж" },
  { slug: "beauty-fitness", categorySlug: "beauty", nameEn: "Coaching & fitness", nameRu: "Коучинг и фитнес" },

  // Праздники / логистика / поддержка
  { slug: "events-capture", categorySlug: "events", nameEn: "Photo, video & DJ", nameRu: "Фото, видео и диджеи" },
  { slug: "events-staff", categorySlug: "events", nameEn: "Waiters & bar staff", nameRu: "Официанты и бармены" },
  { slug: "events-moving", categorySlug: "events", nameEn: "Moving & logistics", nameRu: "Переезды и логистика" },
  { slug: "events-assistant", categorySlug: "events", nameEn: "Personal assistant & admin", nameRu: "Личный помощник" },
];

let seeded = false;

// Идемпотентно создаёт/обновляет подкатегории. Выполняется один раз на процесс.
export async function seedSubcategories(): Promise<void> {
  if (seeded) return;
  seeded = true;
  try {
    const cats = await prisma.category.findMany({ select: { id: true, slug: true } });
    const bySlug = new Map(cats.map((c) => [c.slug, c.id]));
    for (let i = 0; i < SUBCATEGORIES.length; i++) {
      const s = SUBCATEGORIES[i];
      const categoryId = bySlug.get(s.categorySlug);
      if (!categoryId) continue;
      await prisma.subcategory.upsert({
        where: { slug: s.slug },
        create: { slug: s.slug, categoryId, nameEn: s.nameEn, nameRu: s.nameRu, order: i },
        update: { categoryId, nameEn: s.nameEn, nameRu: s.nameRu, order: i },
      });
    }
  } catch (e) {
    seeded = false; // повторим при следующем обращении
    console.error("seedSubcategories failed", e);
  }
}

// Названия подкатегорий на украинском, польском, испанском и португальском.
// en/ru берём из SUBCATEGORIES выше (и из БД); эти четыре языка держим в коде,
// чтобы не заводить новые колонки. Ключ - slug подкатегории.
const SUBCAT_I18N: Record<string, { uk: string; pl: string; es: string; pt: string }> = {
  "chef-dining": { uk: "Приватний шеф: обіди та вечері", pl: "Prywatny szef: obiady i kolacje", es: "Chef privado: comidas y cenas", pt: "Chef privado: almoços e jantares" },
  "chef-celebrations": { uk: "Свята та урочистості", pl: "Przyjęcia i uroczystości", es: "Fiestas y celebraciones", pt: "Festas e celebrações" },
  "chef-workshops": { uk: "Майстер-класи та барбекю", pl: "Warsztaty kulinarne i grill", es: "Talleres de cocina y barbacoa", pt: "Workshops de cozinha e churrasco" },
  "chef-mealprep": { uk: "Заготівля їжі на тиждень", pl: "Przygotowanie posiłków na tydzień", es: "Preparación de comidas semanal", pt: "Preparação de refeições semanais" },
  "handy-furniture": { uk: "Збірка меблів та монтаж", pl: "Montaż mebli i wieszanie", es: "Montaje de muebles e instalación", pt: "Montagem de móveis e fixação" },
  "handy-painting": { uk: "Малярні роботи та декор", pl: "Malowanie i dekorowanie", es: "Pintura y decoración", pt: "Pintura e decoração" },
  "handy-repairs": { uk: "Ремонт та столярні роботи", pl: "Naprawy domowe i stolarka", es: "Reparaciones y carpintería", pt: "Reparações e carpintaria" },
  "handy-electrical": { uk: "Електрика (RECI)", pl: "Prace elektryczne (RECI)", es: "Trabajos eléctricos (RECI)", pt: "Trabalhos elétricos (RECI)" },
  "handy-gas": { uk: "Газові роботи (RGII)", pl: "Prace gazowe (RGII)", es: "Trabajos de gas (RGII)", pt: "Trabalhos de gás (RGII)" },
  "handy-plumbing": { uk: "Сантехніка", pl: "Hydraulika", es: "Fontanería", pt: "Canalização" },
  "handy-appliance": { uk: "Встановлення техніки", pl: "Montaż sprzętu AGD", es: "Instalación de electrodomésticos", pt: "Instalação de eletrodomésticos" },
  "handy-flooring": { uk: "Підлога та плитка", pl: "Podłogi i płytki", es: "Suelos y azulejos", pt: "Pavimentos e azulejos" },
  "clean-house": { uk: "Прибирання будинку", pl: "Sprzątanie domu", es: "Limpieza del hogar", pt: "Limpeza da casa" },
  "clean-endtenancy": { uk: "Прибирання при виїзді", pl: "Sprzątanie po najmie", es: "Limpieza de fin de alquiler", pt: "Limpeza de fim de arrendamento" },
  "clean-garden": { uk: "Сад і догляд за газоном", pl: "Ogród i pielęgnacja trawnika", es: "Jardinería y cuidado del césped", pt: "Jardinagem e cuidado do relvado" },
  "clean-pressure": { uk: "Мийка під тиском", pl: "Mycie ciśnieniowe", es: "Limpieza a presión", pt: "Lavagem a pressão" },
  "massage-relax": { uk: "Розслаблюючий та шведський масаж", pl: "Masaż relaksacyjny i szwedzki", es: "Masaje relajante y sueco", pt: "Massagem relaxante e sueca" },
  "massage-deep": { uk: "Глибокий та спортивний", pl: "Masaż głęboki i sportowy", es: "Tejido profundo y deportivo", pt: "Tecidos profundos e desportiva" },
  "massage-therapy": { uk: "Терапевтичний та лімфатичний", pl: "Terapeutyczny i limfatyczny", es: "Terapéutico y linfático", pt: "Terapêutica e linfática" },
  "beauty-hair": { uk: "Волосся та укладка", pl: "Włosy i stylizacja", es: "Cabello y peinado", pt: "Cabelo e styling" },
  "beauty-nails": { uk: "Манікюр і педикюр", pl: "Paznokcie", es: "Uñas", pt: "Unhas" },
  "beauty-makeup": { uk: "Макіяж", pl: "Makijaż", es: "Maquillaje", pt: "Maquilhagem" },
  "beauty-fitness": { uk: "Коучинг та фітнес", pl: "Coaching i fitness", es: "Coaching y fitness", pt: "Coaching e fitness" },
  "events-capture": { uk: "Фото, відео та діджеї", pl: "Foto, wideo i DJ", es: "Foto, vídeo y DJ", pt: "Foto, vídeo e DJ" },
  "events-staff": { uk: "Офіціанти та бармени", pl: "Kelnerzy i obsługa baru", es: "Camareros y personal de bar", pt: "Empregados de mesa e de bar" },
  "events-moving": { uk: "Переїзди та логістика", pl: "Przeprowadzki i logistyka", es: "Mudanzas y logística", pt: "Mudanças e logística" },
  "events-assistant": { uk: "Особистий помічник", pl: "Asystent osobisty", es: "Asistente personal", pt: "Assistente pessoal" },
};

export function subcatName(sub: { slug?: string; nameEn: string; nameRu: string }, locale: string): string {
  if (locale === "ru") return sub.nameRu;
  if (locale === "en") return sub.nameEn;
  // uk/pl/es/pt: берём из словаря по slug, иначе английское имя как запасное.
  const tr = sub.slug ? SUBCAT_I18N[sub.slug] : undefined;
  if (tr && (locale === "uk" || locale === "pl" || locale === "es" || locale === "pt")) {
    return tr[locale];
  }
  return sub.nameEn;
}

// Регулируемые подкатегории в Ирландии: требуют подтверждающую лицензию.
// Электромонтаж - регистрация RECI; газовые работы - RGII (docs/domora-spec.md,
// каталог v3, раздел про Specialist Trades).
export const REGULATED_LICENCE: Record<string, string> = {
  "handy-electrical": "RECI",
  "handy-gas": "RGII",
};

export function licenceFor(slug: string | null | undefined): string | null {
  return slug ? REGULATED_LICENCE[slug] ?? null : null;
}

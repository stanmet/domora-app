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

export function subcatName(sub: { nameEn: string; nameRu: string }, locale: string): string {
  return locale === "ru" || locale === "uk" ? sub.nameRu : sub.nameEn;
}

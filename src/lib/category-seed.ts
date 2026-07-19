// Полный набор категорий услуг Domora. Засеивается идемпотентно (upsert по slug)
// при первом обращении - как и подкатегории. Порядок отображения задаётся в
// src/components/categories.ts (CATEGORY_ORDER).
import { PriceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CategorySeed = {
  slug: string;
  nameEn: string;
  nameRu: string;
  unitDefault: PriceUnit;
  cancellationTier?: string;
};

export const CATEGORY_SEED: CategorySeed[] = [
  { slug: "chef", nameEn: "Private chef", nameRu: "Повар на дом", unitDefault: PriceUnit.PER_GUEST },
  { slug: "clean", nameEn: "Cleaning", nameRu: "Уборка", unitDefault: PriceUnit.PER_M2 },
  { slug: "handy", nameEn: "Handyman", nameRu: "Мастер на час", unitDefault: PriceUnit.PER_HOUR },
  { slug: "plumbing", nameEn: "Plumbing", nameRu: "Сантехника", unitDefault: PriceUnit.PER_HOUR },
  { slug: "electrical", nameEn: "Electrical", nameRu: "Электрика", unitDefault: PriceUnit.PER_HOUR },
  { slug: "gardening", nameEn: "Gardening", nameRu: "Сад и участок", unitDefault: PriceUnit.PER_HOUR },
  { slug: "beauty", nameEn: "Beauty", nameRu: "Красота", unitDefault: PriceUnit.PER_SESSION },
  { slug: "petcare", nameEn: "Pet care", nameRu: "Уход за питомцами", unitDefault: PriceUnit.PER_HOUR },
  { slug: "moving", nameEn: "Moving", nameRu: "Переезды", unitDefault: PriceUnit.PER_EVENT },
  { slug: "tutoring", nameEn: "Tutoring", nameRu: "Репетиторство", unitDefault: PriceUnit.PER_HOUR },
  { slug: "massage", nameEn: "Massage", nameRu: "Массаж", unitDefault: PriceUnit.PER_SESSION },
  { slug: "events", nameEn: "Events & parties", nameRu: "Праздники и события", unitDefault: PriceUnit.PER_EVENT, cancellationTier: "event" },
  { slug: "other", nameEn: "Other", nameRu: "Другое", unitDefault: PriceUnit.FIXED_QUOTE },
];

let seeded = false;

// Идемпотентно создаёт/обновляет категории. Выполняется один раз на процесс.
export async function ensureCategories(): Promise<void> {
  if (seeded) return;
  seeded = true;
  try {
    for (const c of CATEGORY_SEED) {
      await prisma.category.upsert({
        where: { slug: c.slug },
        create: {
          slug: c.slug,
          nameEn: c.nameEn,
          nameRu: c.nameRu,
          unitDefault: c.unitDefault,
          ...(c.cancellationTier ? { cancellationTier: c.cancellationTier } : {}),
        },
        update: { nameEn: c.nameEn, nameRu: c.nameRu, unitDefault: c.unitDefault },
      });
    }
  } catch (e) {
    seeded = false; // повторим при следующем обращении
    console.error("ensureCategories failed", e);
  }
}

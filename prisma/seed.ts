// Сид: категории услуг, 3 тестовых исполнителя, тестовый клиент и задача на
// доске. Безопасно запускать повторно (upsert / проверка существования).
import { PrismaClient, PriceUnit } from "@prisma/client";
import { encrypt } from "../src/lib/crypto";
import { CATEGORY_SEED } from "../src/lib/category-seed";

const prisma = new PrismaClient();

const categories = CATEGORY_SEED;

const providers = [
  {
    email: "chef@test.domora.ie",
    name: "Aoife Byrne",
    categorySlug: "chef",
    displayName: "Aoife Byrne",
    customProfession: "Повар на дом",
    bio: "Домашние ужины и meal prep на неделю. 8 лет опыта в ресторанах Дублина.",
    city: "Dublin",
    listingTitle: "Ужин на дому для компании до 8 человек",
    priceCents: 4500,
    unit: PriceUnit.PER_GUEST,
  },
  {
    email: "clean@test.domora.ie",
    name: "Marta Kowalska",
    categorySlug: "clean",
    displayName: "Marta Kowalska",
    customProfession: "Клинер",
    bio: "Генеральная и регулярная уборка квартир и офисов.",
    city: "Cork",
    listingTitle: "Генеральная уборка квартиры",
    priceCents: 250,
    unit: PriceUnit.PER_M2,
  },
  {
    email: "handy@test.domora.ie",
    name: "Sean Murphy",
    categorySlug: "handy",
    displayName: "Sean Murphy",
    customProfession: "Мастер на час",
    bio: "Мелкий ремонт, сборка мебели, установка бытовой техники.",
    city: "Galway",
    listingTitle: "Мелкий ремонт и сборка мебели",
    priceCents: 3500,
    unit: PriceUnit.PER_HOUR,
  },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, nameRu: c.nameRu, unitDefault: c.unitDefault },
      create: c,
    });
  }

  for (const p of providers) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.categorySlug } });

    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { email: p.email, name: p.name, roles: ["PROVIDER"], city: p.city },
    });

    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: p.displayName,
        customProfession: p.customProfession,
        bio: p.bio,
        city: p.city,
        status: "ACTIVE",
      },
    });

    const existingListing = await prisma.listing.findFirst({
      where: { providerId: user.id, categoryId: category.id },
    });
    if (!existingListing) {
      await prisma.listing.create({
        data: {
          providerId: user.id,
          categoryId: category.id,
          professionLabel: p.customProfession,
          title: p.listingTitle,
          priceCents: p.priceCents,
          unit: p.unit,
          status: "ACTIVE",
        },
      });
    }
  }

  // Тестовый клиент и одна открытая задача на доске: в категории chef, город
  // Dublin, чтобы исполнитель chef@test.domora.ie видел её в ленте /tasks.
  const client = await prisma.user.upsert({
    where: { email: "client@test.domora.ie" },
    update: {},
    create: { email: "client@test.domora.ie", name: "Liam O'Brien", roles: ["CLIENT"], city: "Dublin" },
  });

  const chefCategory = await prisma.category.findUniqueOrThrow({ where: { slug: "chef" } });
  const existingTask = await prisma.task.findFirst({ where: { clientId: client.id } });
  if (!existingTask) {
    await prisma.task.create({
      data: {
        clientId: client.id,
        categoryId: chefCategory.id,
        title: "Ужин на 6 человек в субботу",
        description: "Нужен повар на семейный ужин, 6 гостей, две перемены блюд. Кухня своя.",
        dateWanted: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        city: "Dublin",
        addressEncrypted: encrypt("12 Grafton Street, Dublin, D02 XY45"),
        budgetFromCents: 20000,
        budgetToCents: 35000,
        status: "OPEN",
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

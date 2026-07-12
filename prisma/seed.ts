// Сид: категории услуг и 3 тестовых исполнителя. Безопасно запускать повторно (upsert).
import { PrismaClient, PriceUnit } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { slug: "chef", nameEn: "Private chef", nameRu: "Повар на дом", unitDefault: PriceUnit.PER_GUEST },
  { slug: "clean", nameEn: "Cleaning", nameRu: "Уборка", unitDefault: PriceUnit.PER_M2 },
  { slug: "handy", nameEn: "Handyman", nameRu: "Мастер на час", unitDefault: PriceUnit.PER_HOUR },
  { slug: "massage", nameEn: "Massage", nameRu: "Массаж", unitDefault: PriceUnit.PER_SESSION },
  { slug: "beauty", nameEn: "Beauty at home", nameRu: "Красота на дому", unitDefault: PriceUnit.PER_SESSION },
  {
    slug: "events",
    nameEn: "Events & parties",
    nameRu: "Праздники и события",
    unitDefault: PriceUnit.PER_EVENT,
    cancellationTier: "event",
  },
  { slug: "other", nameEn: "Other", nameRu: "Другое", unitDefault: PriceUnit.FIXED_QUOTE },
];

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

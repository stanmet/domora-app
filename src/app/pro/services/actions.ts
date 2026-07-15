"use server";

// Управление плашками услуг исполнителя: создание и включение/выключение.
// Новая услуга создается в статусе MODERATION и попадает в каталог только
// после одобрения (docs/domora-spec.md: плашки проверяет модерация).
// Первая плашка переводит профиль исполнителя из DRAFT в MODERATION.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ListingStatus, PriceUnit, ProviderStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { licenceFor } from "@/lib/subcategories";

// Единицы, доступные в форме. Цена по смете (FIXED_QUOTE) пойдет через сметы
// в следующих спринтах, поэтому в форме ее нет. Из "use server"-файла можно
// экспортировать только async-функции, поэтому список не экспортируется.
const FORM_UNITS: PriceUnit[] = [
  PriceUnit.PER_HOUR,
  PriceUnit.PER_EVENT,
  PriceUnit.PER_SESSION,
  PriceUnit.PER_GUEST,
  PriceUnit.PER_M2,
];

export type CreateListingState = { ok: true } | { error: string } | null;

async function requireProvider() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/services");
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");
  return { user, locale };
}

export async function createListing(
  _prev: CreateListingState,
  formData: FormData,
): Promise<CreateListingState> {
  const { user, locale } = await requireProvider();
  const t = getDict(locale);

  const title = String(formData.get("title") ?? "").trim();
  const who = String(formData.get("who") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categorySlug = String(formData.get("category") ?? "");
  const unit = String(formData.get("unit") ?? "") as PriceUnit;
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));

  if (!title || !Number.isFinite(price) || price <= 0 || !FORM_UNITS.includes(unit)) {
    return { error: t.errSvcForm };
  }

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return { error: t.errSvcForm };

  // Необязательная подкатегория (должна принадлежать выбранной категории).
  const subSlug = String(formData.get("subcategory") ?? "");
  let subcategoryId: string | null = null;
  if (subSlug) {
    try {
      const sub = await prisma.subcategory.findUnique({ where: { slug: subSlug }, select: { id: true, categoryId: true } });
      if (sub && sub.categoryId === category.id) subcategoryId = sub.id;
    } catch {
      // Таблица подкатегорий недоступна: сохраняем услугу без подкатегории.
    }
  }

  // Регулируемые услуги (электрика RECI, газ RGII) требуют загруженную лицензию.
  if (licenceFor(subSlug)) {
    let docCount = 0;
    try {
      docCount = await prisma.providerDocument.count({ where: { providerId: user.id } });
    } catch {
      // Таблица документов недоступна: не блокируем публикацию.
    }
    if (docCount === 0) return { error: t.errNeedLicence };
  }

  // Профиль исполнителя может еще не существовать (шаг Stripe не пройден).
  let profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.providerProfile.create({
      data: { userId: user.id, displayName: user.name, city: user.city ?? "Dublin" },
    });
  }

  await prisma.$transaction([
    prisma.listing.create({
      data: {
        providerId: user.id,
        categoryId: category.id,
        subcategoryId,
        professionLabel: who || null,
        title,
        titleLang: locale,
        description: description || null,
        priceCents: Math.round(price * 100),
        unit,
        status: ListingStatus.MODERATION,
      },
    }),
    ...(profile.status === ProviderStatus.DRAFT
      ? [
          prisma.providerProfile.update({
            where: { userId: user.id },
            data: { status: ProviderStatus.MODERATION },
          }),
        ]
      : []),
  ]);

  revalidatePath("/pro/services");
  revalidatePath("/pro");
  return { ok: true };
}

export async function toggleListing(listingId: string): Promise<void> {
  const { user } = await requireProvider();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.providerId !== user.id) return;

  // Включать и выключать можно только одобренные услуги;
  // плашки на модерации и отклоненные ждут решения модерации.
  const next =
    listing.status === ListingStatus.ACTIVE
      ? ListingStatus.PAUSED
      : listing.status === ListingStatus.PAUSED
        ? ListingStatus.ACTIVE
        : null;
  if (!next) return;

  await prisma.listing.update({ where: { id: listingId }, data: { status: next } });
  revalidatePath("/pro/services");
}

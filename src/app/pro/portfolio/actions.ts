"use server";

// Управление фото портфолио исполнителя:
// - галерея профиля (до 20 фото, ProviderProfile.portfolioPhotos);
// - фото отдельной услуги (до 10 фото, Listing.photos).
// Файлы загружаются в Supabase Storage (bucket "portfolio"), в базе хранятся
// публичные URL. Загрузка требует сервисного ключа SUPABASE_SERVICE_ROLE_KEY.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { MAX_LISTING_PHOTOS, MAX_PORTFOLIO_PHOTOS, removeImage, uploadImages } from "@/lib/storage";

async function requireProvider() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/portfolio");
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");
  return user;
}

function filesFrom(formData: FormData): File[] {
  return formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
}

// Добавить фото в галерею профиля (учитывая лимит).
export async function addPortfolioPhotos(formData: FormData): Promise<void> {
  const user = await requireProvider();
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { portfolioPhotos: true },
  });
  if (!profile) return;

  const remaining = MAX_PORTFOLIO_PHOTOS - profile.portfolioPhotos.length;
  if (remaining <= 0) return;

  const files = filesFrom(formData).slice(0, remaining);
  const urls = await uploadImages(files, `profiles/${user.id}`);
  if (urls.length === 0) return;

  await prisma.providerProfile.update({
    where: { userId: user.id },
    data: { portfolioPhotos: [...profile.portfolioPhotos, ...urls] },
  });
  revalidatePath("/pro/portfolio");
  revalidatePath(`/providers/${user.id}`);
}

// Удалить фото из галереи профиля.
export async function removePortfolioPhoto(formData: FormData): Promise<void> {
  const user = await requireProvider();
  const url = String(formData.get("url") ?? "");
  if (!url) return;
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { portfolioPhotos: true },
  });
  if (!profile) return;

  await prisma.providerProfile.update({
    where: { userId: user.id },
    data: { portfolioPhotos: profile.portfolioPhotos.filter((u) => u !== url) },
  });
  await removeImage(url);
  revalidatePath("/pro/portfolio");
  revalidatePath(`/providers/${user.id}`);
}

// Добавить фото к услуге (учитывая лимит и владельца).
export async function addListingPhotos(listingId: string, formData: FormData): Promise<void> {
  const user = await requireProvider();
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { providerId: true, photos: true },
  });
  if (!listing || listing.providerId !== user.id) return;

  const remaining = MAX_LISTING_PHOTOS - listing.photos.length;
  if (remaining <= 0) return;

  const files = filesFrom(formData).slice(0, remaining);
  const urls = await uploadImages(files, `listings/${listingId}`);
  if (urls.length === 0) return;

  await prisma.listing.update({
    where: { id: listingId },
    data: { photos: [...listing.photos, ...urls] },
  });
  revalidatePath("/pro/portfolio");
  revalidatePath(`/providers/${user.id}`);
}

// Удалить фото услуги.
export async function removeListingPhoto(listingId: string, formData: FormData): Promise<void> {
  const user = await requireProvider();
  const url = String(formData.get("url") ?? "");
  if (!url) return;
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { providerId: true, photos: true },
  });
  if (!listing || listing.providerId !== user.id) return;

  await prisma.listing.update({
    where: { id: listingId },
    data: { photos: listing.photos.filter((u) => u !== url) },
  });
  await removeImage(url);
  revalidatePath("/pro/portfolio");
  revalidatePath(`/providers/${user.id}`);
}

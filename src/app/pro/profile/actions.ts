"use server";

// Редактирование профиля исполнителя: имя, профессия, город, «о себе», радиус
// выезда. Профиль создаётся, если его ещё нет (например, до первой услуги).
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";

export type ProfileState = { ok: boolean; msg: string } | null;

export async function updateProviderProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const authUser = await getAuthUser();
  const locale = await getLocale();
  const t = getDict(locale);
  if (!authUser?.email) return { ok: false, msg: t.ppNameCityReq };
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) return { ok: false, msg: t.ppNameCityReq };

  const displayName = String(formData.get("displayName") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const customProfession = String(formData.get("customProfession") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const travelRadiusKm = Math.max(1, Math.min(500, Math.floor(Number(formData.get("travelRadiusKm")) || 20)));
  // Необязательные реквизиты для инвойса.
  const legalName = String(formData.get("legalName") ?? "").trim().slice(0, 120) || null;
  const businessAddress = String(formData.get("businessAddress") ?? "").trim().slice(0, 200) || null;
  const vatNumber = String(formData.get("vatNumber") ?? "").trim().slice(0, 40) || null;

  if (!displayName || !city) return { ok: false, msg: t.ppNameCityReq };

  await prisma.providerProfile.upsert({
    where: { userId: user.id },
    update: { displayName, city, customProfession, bio, bioLang: locale, travelRadiusKm, legalName, businessAddress, vatNumber },
    create: { userId: user.id, displayName, city, customProfession, bio, bioLang: locale, travelRadiusKm, legalName, businessAddress, vatNumber },
  });

  revalidatePath("/pro");
  revalidatePath("/pro/profile");
  return { ok: true, msg: t.ppSaved };
}

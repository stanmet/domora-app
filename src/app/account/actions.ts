"use server";

// Управление собственным аккаунтом: редактирование данных и удаление.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { BookingStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { uploadImage } from "@/lib/storage";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";

// Заказы, при которых удаление аккаунта запрещено (деньги/обязательства в игре).
const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.REQUESTED,
  BookingStatus.ACCEPTED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.DISPUTED,
];

// Сохранение личных данных: имя, телефон, язык интерфейса.
export async function updateProfile(formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/account");
  const user = await ensureDbUser(authUser, await getLocale());

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const phoneRaw = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const phone = phoneRaw || null;
  const localeRaw = String(formData.get("locale") ?? "");
  const locale = (LOCALES as readonly string[]).includes(localeRaw) ? (localeRaw as Locale) : user.locale;

  if (!name) {
    redirect("/account?err=name");
  }

  // Аватар: загружаем, если приложен файл; иначе оставляем прежний.
  const avatarFile = formData.get("avatar");
  let avatarUrl: string | undefined;
  let uploadFailed = false;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const url = await uploadImage(avatarFile, `avatar/${user.id}`);
    if (url) avatarUrl = url;
    else uploadFailed = true; // хранилище недоступно или файл отклонён
  }

  let phoneTaken = false;
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name, phone, locale, ...(avatarUrl ? { avatarUrl } : {}) },
    });
  } catch (e) {
    // Телефон уникален (один номер - один аккаунт): если занят, сохраняем
    // остальные поля без телефона и сообщаем пользователю.
    console.error("updateProfile failed", e);
    phoneTaken = true;
    await prisma.user.update({ where: { id: user.id }, data: { name, locale, ...(avatarUrl ? { avatarUrl } : {}) } });
  }

  // Язык интерфейса храним и в cookie, чтобы страницы сразу переключились.
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/account");
  // Приоритет сообщений: занятый телефон важнее, чем сбой загрузки аватара.
  if (phoneTaken) redirect("/account?err=phone");
  if (uploadFailed) redirect("/account?err=upload");
  redirect("/account?saved=1");
}

// Стать исполнителем: добавляем роль PROVIDER текущему аккаунту и создаём
// профиль-черновик, если его ещё нет. Один аккаунт может быть и клиентом, и
// исполнителем; переключение между кабинетами - через меню.
export async function becomeProvider(): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/account");
  const user = await ensureDbUser(authUser, await getLocale());

  if (!user.roles.includes(Role.PROVIDER)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { roles: { set: [...user.roles, Role.PROVIDER] } },
    });
  }

  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id }, select: { userId: true } });
  if (!profile) {
    await prisma.providerProfile.create({
      data: {
        userId: user.id,
        displayName: user.name,
        city: user.city ?? "",
        status: "DRAFT",
      },
    });
  }

  revalidatePath("/account");
  redirect("/pro");
}

// Удаление аккаунта. Блокируется при активных заказах. Иначе обезличиваем данные
// в нашей базе (связи с заказами/отзывами сохраняются) и удаляем вход в Supabase.
export async function deleteAccount(): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/account");
  const user = await ensureDbUser(authUser, await getLocale());

  const active = await prisma.booking.count({
    where: {
      status: { in: ACTIVE_STATUSES },
      OR: [{ clientId: user.id }, { providerId: user.id }],
    },
  });
  if (active > 0) redirect("/account?err=active");

  // Обезличивание: email должен остаться уникальным, поэтому подставляем метку.
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: "Deleted user",
        email: `deleted+${user.id}@domora.invalid`,
        phone: null,
        status: "BANNED",
      },
    });
  } catch (e) {
    console.error("anonymize on delete failed", e);
  }

  // Удаляем вход в Supabase Auth, чтобы пользователь больше не мог войти.
  try {
    await getSupabaseAdmin().auth.admin.deleteUser(authUser.id);
  } catch (e) {
    console.error("supabase deleteUser failed", e);
  }

  // Завершаем текущую сессию и уводим на главную.
  const supabase = await getSupabaseServer();
  await supabase?.auth.signOut().catch(() => {});
  redirect("/?deleted=1");
}

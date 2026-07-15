"use server";

// Управление собственным аккаунтом: редактирование данных и удаление.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
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

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name, phone, locale },
    });
  } catch (e) {
    // Телефон уникален: если занят другим аккаунтом, сохраняем без него.
    console.error("updateProfile failed", e);
    await prisma.user.update({ where: { id: user.id }, data: { name, locale } });
  }

  // Язык интерфейса храним и в cookie, чтобы страницы сразу переключились.
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/account");
  redirect("/account?saved=1");
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

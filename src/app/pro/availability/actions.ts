"use server";

// Управление расписанием исполнителя: рабочие дни и часы + блокировка дат
// (выходной/отпуск). Профиль создаётся при необходимости.
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { hhmmToMin } from "@/lib/availability";

async function requireProvider() {
  const authUser = await getAuthUser();
  if (!authUser?.email) return null;
  const user = await ensureDbUser(authUser, await getLocale());
  if (!user.roles.includes(Role.PROVIDER)) return null;
  return user;
}

export async function saveSchedule(formData: FormData): Promise<void> {
  const user = await requireProvider();
  if (!user) return;

  const workDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => formData.get(`d${d}`) === "on");
  const startMin = Math.max(0, Math.min(1439, hhmmToMin(String(formData.get("start") ?? "09:00"))));
  const endMinRaw = Math.max(0, Math.min(1439, hhmmToMin(String(formData.get("end") ?? "20:00"))));
  const endMin = Math.max(endMinRaw, startMin + 30); // окно минимум 30 минут

  await prisma.providerProfile.upsert({
    where: { userId: user.id },
    update: { workDays, workStartMin: startMin, workEndMin: endMin },
    create: {
      userId: user.id,
      displayName: user.name,
      city: user.city ?? "Dublin",
      workDays,
      workStartMin: startMin,
      workEndMin: endMin,
    },
  });
  revalidatePath("/pro/availability");
}

export async function addTimeOff(formData: FormData): Promise<void> {
  const user = await requireProvider();
  if (!user) return;
  const raw = String(formData.get("date") ?? "").trim(); // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return;

  // Профиль обязателен для внешнего ключа: создаём, если ещё нет.
  await prisma.providerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, displayName: user.name, city: user.city ?? "Dublin" },
  });
  await prisma.timeOff.upsert({
    where: { providerId_date: { providerId: user.id, date } },
    update: {},
    create: { providerId: user.id, date },
  });
  revalidatePath("/pro/availability");
}

export async function removeTimeOff(formData: FormData): Promise<void> {
  const user = await requireProvider();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.timeOff.deleteMany({ where: { id, providerId: user.id } });
  revalidatePath("/pro/availability");
}

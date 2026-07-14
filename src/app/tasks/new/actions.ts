"use server";

// Публикация задачи на доске. Оплаты на этом шаге нет: клиент только описывает,
// что нужно сделать. Адрес шифруется, как в брони. Задача живёт 7 дней.
import { redirect } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { encrypt } from "@/lib/crypto";
import { TASK_TTL_DAYS } from "@/lib/tasks";

export type CreateTaskState = { error: string } | null;

// Бюджет из строки евро в центы; пустое поле разрешено.
function toCents(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function createTask(_prev: CreateTaskState, formData: FormData): Promise<CreateTaskState> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/new");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categorySlug = String(formData.get("category") ?? "");
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const budgetFromCents = toCents(formData.get("budgetFrom"));
  const budgetToCents = toCents(formData.get("budgetTo"));

  if (!title || !categorySlug || !city || !address || !dateRaw) {
    return { error: t.errTaskForm };
  }

  const dateWanted = new Date(`${dateRaw}T12:00:00`);
  if (Number.isNaN(dateWanted.getTime())) return { error: t.errTaskForm };

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return { error: t.errTaskForm };

  await prisma.task.create({
    data: {
      clientId: user.id,
      categoryId: category.id,
      title,
      description: description || title,
      dateWanted,
      city,
      addressEncrypted: encrypt(address),
      budgetFromCents,
      budgetToCents,
      status: TaskStatus.OPEN,
      expiresAt: new Date(Date.now() + TASK_TTL_DAYS * 24 * 3600 * 1000),
    },
  });

  redirect("/tasks/mine");
}

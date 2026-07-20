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
import { uploadImage } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

export type CreateTaskState = { error: string } | null;

const MAX_TASK_PHOTOS = 6;

// Загружает прикреплённые к заявке фото (до лимита), возвращает список URL.
async function uploadTaskPhotos(formData: FormData, userId: string): Promise<string[]> {
  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_TASK_PHOTOS);
  const urls: string[] = [];
  for (const f of files) {
    const url = await uploadImage(f, `task/${userId}`);
    if (url) urls.push(url);
  }
  return urls;
}

// Бюджет из строки евро в центы; пустое поле разрешено.
function toCents(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const MAX_BUDGET_CENTS = 100_000 * 100; // €100 000 - разумный верхний предел

// Серверная валидация даты (не в прошлом) и границ бюджета. Клиентские
// ограничения (min=today) можно обойти, поэтому проверяем и на сервере.
function validateTaskDateBudget(
  dateRaw: string,
  budgetFromCents: number | null,
  budgetToCents: number | null,
): { valid: boolean; dateWanted: Date } {
  const dateWanted = new Date(`${dateRaw}T12:00:00`);
  if (Number.isNaN(dateWanted.getTime())) return { valid: false, dateWanted };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (dateWanted.getTime() < startOfToday.getTime()) return { valid: false, dateWanted };
  if (budgetFromCents != null && budgetFromCents > MAX_BUDGET_CENTS) return { valid: false, dateWanted };
  if (budgetToCents != null && budgetToCents > MAX_BUDGET_CENTS) return { valid: false, dateWanted };
  if (budgetFromCents != null && budgetToCents != null && budgetFromCents > budgetToCents) {
    return { valid: false, dateWanted };
  }
  return { valid: true, dateWanted };
}

export async function createTask(_prev: CreateTaskState, formData: FormData): Promise<CreateTaskState> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/new");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  // Анти-спам: не более 10 задач в час с аккаунта.
  if (!rateLimit(`task:${user.id}`, 10, 60 * 60 * 1000)) return { error: t.errTaskForm };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categorySlug = String(formData.get("category") ?? "");
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const budgetFromCents = toCents(formData.get("budgetFrom"));
  const budgetToCents = toCents(formData.get("budgetTo"));

  // Адрес по ТЗ необязателен (можно уточнить в чате после выбора исполнителя).
  if (!title || !categorySlug || !city || !dateRaw) {
    return { error: t.errTaskForm };
  }

  const { valid, dateWanted } = validateTaskDateBudget(dateRaw, budgetFromCents, budgetToCents);
  if (!valid) return { error: t.errTaskForm };

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return { error: t.errTaskForm };

  const photos = await uploadTaskPhotos(formData, user.id);

  await prisma.task.create({
    data: {
      clientId: user.id,
      categoryId: category.id,
      title,
      description: description || title,
      dateWanted,
      city,
      addressEncrypted: encrypt(address),
      photos,
      budgetFromCents,
      budgetToCents,
      status: TaskStatus.OPEN,
      expiresAt: new Date(Date.now() + TASK_TTL_DAYS * 24 * 3600 * 1000),
    },
  });

  redirect("/tasks/mine");
}

// Редактирование задачи клиентом: доступно только автору и только пока задача
// открыта (нет выбранного исполнителя). Новые фото добавляются к существующим.
export async function updateTask(taskId: string, _prev: CreateTaskState, formData: FormData): Promise<CreateTaskState> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/mine");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { clientId: true, status: true } });
  if (!task || task.clientId !== user.id || task.status !== TaskStatus.OPEN) {
    return { error: t.errTaskForm };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categorySlug = String(formData.get("category") ?? "");
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const budgetFromCents = toCents(formData.get("budgetFrom"));
  const budgetToCents = toCents(formData.get("budgetTo"));

  if (!title || !categorySlug || !city || !dateRaw) {
    return { error: t.errTaskForm };
  }
  const { valid, dateWanted } = validateTaskDateBudget(dateRaw, budgetFromCents, budgetToCents);
  if (!valid) return { error: t.errTaskForm };

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return { error: t.errTaskForm };

  const newPhotos = await uploadTaskPhotos(formData, user.id);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      categoryId: category.id,
      title,
      description: description || title,
      dateWanted,
      city,
      addressEncrypted: encrypt(address),
      budgetFromCents,
      budgetToCents,
      ...(newPhotos.length ? { photos: { push: newPhotos } } : {}),
    },
  });

  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

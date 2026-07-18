"use server";

// Экшены раздела «Тестовые пользователи». Каждый проверяет роль ADMIN.
// Создание/удаление синтетических аккаунтов и запись в журнал аудита - в index.ts.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  createTestUsers,
  deleteTestUsers,
  MAX_TEST_USERS_PER_BATCH,
  MIN_TEST_USERS_PER_BATCH,
  type CreateRole,
} from "@/lib/test-users";
import type { TextQuality } from "@/lib/test-users/ai";

export type CreateState = { ok: boolean; message: string } | null;

const ROLES: CreateRole[] = ["provider", "client", "mixed"];
const QUALITIES: TextQuality[] = ["basic", "ai", "ai_high"];
const LANGS = ["", "en", "ru", "uk", "pl", "es", "pt"];

export async function createTestUsersAction(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const admin = await requireAdmin();

  const count = Number(formData.get("count"));
  const roleRaw = String(formData.get("role") ?? "mixed");
  const role: CreateRole = ROLES.includes(roleRaw as CreateRole) ? (roleRaw as CreateRole) : "mixed";
  const categorySlug = String(formData.get("category") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const langRaw = String(formData.get("lang") ?? "").trim();
  const lang = LANGS.includes(langRaw) ? langRaw : "";
  const qualityRaw = String(formData.get("quality") ?? "ai");
  const quality: TextQuality = QUALITIES.includes(qualityRaw as TextQuality) ? (qualityRaw as TextQuality) : "ai";
  const listingsPerProvider = Math.max(1, Math.min(5, Math.floor(Number(formData.get("listings")) || 1)));

  if (!Number.isFinite(count) || count < MIN_TEST_USERS_PER_BATCH || count > MAX_TEST_USERS_PER_BATCH) {
    return { ok: false, message: `Количество должно быть от ${MIN_TEST_USERS_PER_BATCH} до ${MAX_TEST_USERS_PER_BATCH}.` };
  }

  try {
    const res = await createTestUsers({ count, role, categorySlug, city, lang, quality, listingsPerProvider, actorId: admin.id });
    revalidatePath("/admin");
    const parts = [
      `Создано ${res.created} (исполнителей: ${res.providers}, клиентов: ${res.clients}).`,
      `Генерация: ${res.method === "ai" ? "AI (Claude)" : "встроенный генератор"}.`,
    ];
    if (res.note) parts.push(res.note);
    return { ok: true, message: parts.join(" ") };
  } catch (e) {
    return { ok: false, message: "Ошибка: " + (e instanceof Error ? e.message : "не удалось создать") };
  }
}

// Удалить все тестовые аккаунты.
export async function deleteAllTestUsersAction(): Promise<void> {
  const admin = await requireAdmin();
  await deleteTestUsers(admin.id);
  revalidatePath("/admin");
}

// Удалить выбранные (чекбоксы name="id").
export async function deleteSelectedTestUsersAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (ids.length) await deleteTestUsers(admin.id, ids);
  revalidatePath("/admin");
}

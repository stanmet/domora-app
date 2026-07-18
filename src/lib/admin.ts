// Общая логика админки: проверка роли ADMIN и запись действий в AdminAction.
// Роль ADMIN проставляется вручную в базе (см. README раздела админки).
import { redirect } from "next/navigation";
import { Role, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";

// Разделы админки, на которые можно выдать точечные права. "admins" -
// управление администраторами, доступно только суперадминам.
export const ADMIN_SCOPES = [
  "moderation",
  "disputes",
  "documents",
  "users",
  "providers",
  "bookings",
  "testUsers",
  "admins",
] as const;
export type AdminScope = (typeof ADMIN_SCOPES)[number];

// Полный доступ, если прав не задано (легаси-админы) или задан "all".
export function isSuperAdmin(user: { adminScopes: string[] }): boolean {
  return user.adminScopes.length === 0 || user.adminScopes.includes("all");
}

// Есть ли у пользователя доступ к конкретному разделу.
export function hasScope(user: { adminScopes: string[] }, scope: AdminScope): boolean {
  return isSuperAdmin(user) || user.adminScopes.includes(scope);
}

// Пускает в админку только пользователя с ролью ADMIN. Остальных уводит:
// гостя на вход, вошедшего без прав в личный кабинет.
export async function requireAdmin(): Promise<User> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/admin");
  const user = await ensureDbUser(authUser, await getLocale());
  if (!user.roles.includes(Role.ADMIN)) redirect("/account");
  return user;
}

// Пускает в раздел только админа с соответствующим правом (или суперадмина).
export async function requireAdminScope(scope: AdminScope): Promise<User> {
  const user = await requireAdmin();
  if (!hasScope(user, scope)) redirect("/admin");
  return user;
}

// Запись действия админа. Пишется в той же транзакции, что и само изменение,
// поэтому возвращает промис-операцию Prisma, а не выполняет ее сама.
export function adminActionLog(
  adminId: string,
  targetType: string,
  targetId: string,
  action: string,
  note?: string,
) {
  return prisma.adminAction.create({
    data: { adminId, targetType, targetId, action, note: note ?? null },
  });
}

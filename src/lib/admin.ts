// Общая логика админки: проверка роли ADMIN и запись действий в AdminAction.
// Роль ADMIN проставляется вручную в базе (см. README раздела админки).
import { redirect } from "next/navigation";
import { Role, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";

// Пускает в админку только пользователя с ролью ADMIN. Остальных уводит:
// гостя на вход, вошедшего без прав в личный кабинет.
export async function requireAdmin(): Promise<User> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/admin");
  const user = await ensureDbUser(authUser, await getLocale());
  if (!user.roles.includes(Role.ADMIN)) redirect("/account");
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

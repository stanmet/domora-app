// Пользователь в таблице User (Prisma), привязанный к аккаунту Supabase Auth.
// Создается при первом входе; роль берется из user_metadata, заданной при регистрации.
import type { User as AuthUser } from "@supabase/supabase-js";
import { Role, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function ensureDbUser(authUser: AuthUser, locale: string): Promise<User> {
  const email = authUser.email;
  if (!email) throw new Error("Supabase user has no email");

  const meta = (authUser.user_metadata ?? {}) as { name?: string; role?: string };
  const wantsProvider = meta.role === "provider";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Регистрация исполнителем с уже существующим аккаунтом: добавляем роль.
    if (wantsProvider && !existing.roles.includes(Role.PROVIDER)) {
      return prisma.user.update({
        where: { email },
        data: { roles: [...existing.roles, Role.PROVIDER] },
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      email,
      name: meta.name?.trim() || email.split("@")[0],
      locale,
      roles: wantsProvider ? [Role.CLIENT, Role.PROVIDER] : [Role.CLIENT],
    },
  });
}

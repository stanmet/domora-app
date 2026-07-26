// Пользователь в таблице User (Prisma), привязанный к аккаунту Supabase Auth.
// Создается при первом входе; роль берется из user_metadata, заданной при регистрации.
import type { User as AuthUser } from "@supabase/supabase-js";
import { Role, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Владелец(ы) проекта: этим адресам роль ADMIN выдаётся автоматически при входе,
// без ручных действий в базе. Задаётся через ADMIN_BOOTSTRAP_EMAILS (через запятую),
// по умолчанию - контактный ящик проекта. Сравнение без учёта регистра.
const OWNER_EMAILS = new Set(
  (process.env.ADMIN_BOOTSTRAP_EMAILS || "domora.irish@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

function isOwnerEmail(email: string): boolean {
  return OWNER_EMAILS.has(email.trim().toLowerCase());
}

export async function ensureDbUser(authUser: AuthUser, locale: string): Promise<User> {
  const email = authUser.email;
  if (!email) throw new Error("Supabase user has no email");

  const meta = (authUser.user_metadata ?? {}) as { name?: string; role?: string };
  const wantsProvider = meta.role === "provider";
  const owner = isOwnerEmail(email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Доводим роли до нужных: исполнитель при регистрации Pro; ADMIN для владельца.
    const roles = [...existing.roles];
    if (wantsProvider && !roles.includes(Role.PROVIDER)) roles.push(Role.PROVIDER);
    if (owner && !roles.includes(Role.ADMIN)) roles.push(Role.ADMIN);
    if (roles.length !== existing.roles.length) {
      return prisma.user.update({ where: { email }, data: { roles } });
    }
    return existing;
  }

  const roles: Role[] = [Role.CLIENT];
  if (wantsProvider) roles.push(Role.PROVIDER);
  if (owner) roles.push(Role.ADMIN);

  return prisma.user.create({
    data: {
      email,
      name: meta.name?.trim() || email.split("@")[0],
      locale,
      roles,
    },
  });
}

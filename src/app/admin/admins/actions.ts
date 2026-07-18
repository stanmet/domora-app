"use server";

// Управление администраторами: выдача роли ADMIN с точечными правами (scopes)
// и её снятие. Доступно только суперадминам (право "admins").
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminScope, ADMIN_SCOPES, type AdminScope } from "@/lib/admin";

export type AdminState = { ok: boolean; message: string } | null;

export async function grantAdminAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminScope("admins");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, message: "Укажите email." };

  const full = formData.get("full") === "on";
  const scopes = full
    ? ["all"]
    : ADMIN_SCOPES.filter((s) => formData.get(`scope_${s}`) === "on") as AdminScope[];

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, roles: true } });
  if (!user) return { ok: false, message: "Пользователь с таким email не найден (он должен хотя бы раз войти)." };
  if (user.roles.includes(Role.ADMIN) && user.roles.length && scopes.length === 0 && !full) {
    return { ok: false, message: "Выберите хотя бы одно право или «полный доступ»." };
  }
  if (!full && scopes.length === 0) return { ok: false, message: "Выберите хотя бы одно право или «полный доступ»." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      roles: user.roles.includes(Role.ADMIN) ? user.roles : [...user.roles, Role.ADMIN],
      adminScopes: scopes,
    },
  });
  revalidatePath("/admin");
  return { ok: true, message: `Права выданы: ${email} (${full ? "полный доступ" : scopes.join(", ")}).` };
}

export async function revokeAdminAction(formData: FormData): Promise<void> {
  const me = await requireAdminScope("admins");
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) return; // нельзя снять права с самого себя
  const user = await prisma.user.findUnique({ where: { id }, select: { roles: true } });
  if (!user) return;
  await prisma.user.update({
    where: { id },
    data: { roles: user.roles.filter((r) => r !== Role.ADMIN), adminScopes: [] },
  });
  revalidatePath("/admin");
}

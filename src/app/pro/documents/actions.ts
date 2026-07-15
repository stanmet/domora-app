"use server";

// Документы исполнителя для верификации: сертификаты, дипломы, разрешения,
// лицензии (RECI/RGII), страховки. Файлы в Supabase Storage, записи в базе.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { removeImage, uploadDocument } from "@/lib/storage";

const MAX_DOCS = 20;
const KINDS = new Set(["certificate", "diploma", "permit", "licence", "insurance", "other"]);

async function requireProvider() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/documents");
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");
  return user;
}

export async function addDocument(formData: FormData): Promise<void> {
  const user = await requireProvider();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const kind = String(formData.get("kind") ?? "other");
  const label = String(formData.get("label") ?? "").trim().slice(0, 120) || null;

  const count = await prisma.providerDocument.count({ where: { providerId: user.id } });
  if (count >= MAX_DOCS) return;

  const url = await uploadDocument(file, `docs/${user.id}`);
  if (!url) return;

  await prisma.providerDocument.create({
    data: { providerId: user.id, url, kind: KINDS.has(kind) ? kind : "other", label },
  });
  revalidatePath("/pro/documents");
}

export async function removeDocument(id: string): Promise<void> {
  const user = await requireProvider();
  const doc = await prisma.providerDocument.findUnique({ where: { id }, select: { providerId: true, url: true } });
  if (!doc || doc.providerId !== user.id) return;
  await prisma.providerDocument.delete({ where: { id } });
  await removeImage(doc.url);
  revalidatePath("/pro/documents");
}

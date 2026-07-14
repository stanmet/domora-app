"use server";

// Избранные исполнители: добавить/убрать. Требует входа.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";

export async function toggleFavorite(providerId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/providers/${providerId}`);
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);

  const existing = await prisma.favorite.findUnique({
    where: { userId_providerId: { userId: user.id, providerId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { userId_providerId: { userId: user.id, providerId } } });
  } else {
    await prisma.favorite.create({ data: { userId: user.id, providerId } });
  }
  revalidatePath("/favorites");
  revalidatePath(`/providers/${providerId}`);
}

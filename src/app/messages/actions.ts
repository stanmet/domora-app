"use server";

// Отправка сообщения в чат брони. Участники - клиент и исполнитель этой брони.
// Контакты (телефон, email, ссылки) скрываются до подтверждения брони.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { filterContacts } from "@/lib/contact-filter";

const CONTACTS_ALLOWED = new Set(["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLOSED", "DISPUTED"]);

export async function sendMessage(threadId: string, formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/messages/${threadId}`);
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: { booking: { select: { clientId: true, providerId: true, status: true } } },
  });
  if (!thread?.booking) return;
  const { clientId, providerId, status } = thread.booking;
  if (user.id !== clientId && user.id !== providerId) return;

  const filtered = CONTACTS_ALLOWED.has(status) ? { text, flagged: false } : filterContacts(text, t.contactRedacted);

  await prisma.message.create({
    data: {
      threadId,
      authorId: user.id,
      textOriginal: filtered.text,
      langOriginal: locale, // язык интерфейса автора; DeepL определит язык при переводе
      contactFilterFlag: filtered.flagged,
    },
  });
  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
}

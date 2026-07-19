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
import { rateLimit } from "@/lib/rate-limit";
import { notify } from "@/lib/notify";
import { uploadImage } from "@/lib/storage";

const CONTACTS_ALLOWED = new Set(["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLOSED", "DISPUTED"]);

export async function sendMessage(threadId: string, formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/messages/${threadId}`);
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  const text = String(formData.get("text") ?? "").trim();
  const imageFile = formData.get("image");
  const hasImage = imageFile instanceof File && imageFile.size > 0;
  // Пустое сообщение без фото не отправляем.
  if (!text && !hasImage) return;

  // Антиспам: не более 20 сообщений в минуту с аккаунта.
  if (!rateLimit(`msg:${user.id}`, 20, 60 * 1000)) return;

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: { booking: { select: { clientId: true, providerId: true, status: true } } },
  });
  if (!thread?.booking) return;
  const { clientId, providerId, status } = thread.booking;
  if (user.id !== clientId && user.id !== providerId) return;

  const recipient = user.id === clientId ? providerId : clientId;
  // Блокировка: если одна из сторон заблокировала другую - сообщение не уходит.
  const blocked = await prisma.chatBlock
    .findFirst({
      where: { OR: [{ blockerId: user.id, blockedId: recipient }, { blockerId: recipient, blockedId: user.id }] },
      select: { id: true },
    })
    .catch(() => null);
  if (blocked) return;

  const filtered = CONTACTS_ALLOWED.has(status) ? { text, flagged: false } : filterContacts(text, t.contactRedacted);

  // Фото: загружаем в хранилище; если не удалось - отправляем только текст.
  const attachments: string[] = [];
  if (hasImage) {
    const url = await uploadImage(imageFile as File, `chat/${threadId}`);
    if (url) attachments.push(url);
  }
  if (!filtered.text && attachments.length === 0) return;

  await prisma.message.create({
    data: {
      threadId,
      authorId: user.id,
      textOriginal: filtered.text,
      langOriginal: locale, // язык интерфейса автора; DeepL определит язык при переводе
      contactFilterFlag: filtered.flagged,
      attachments,
    },
  });

  // Уведомляем собеседника о новом сообщении.
  await notify(recipient, "message", { threadId });

  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
}

// Заблокировать собеседника в чате: он больше не сможет писать этому
// пользователю. Направленная блокировка (снимается unblockUser).
export async function blockUser(threadId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/messages/${threadId}`);
  const user = await ensureDbUser(authUser, await getLocale());

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: { booking: { select: { clientId: true, providerId: true } } },
  });
  if (!thread?.booking) return;
  const { clientId, providerId } = thread.booking;
  if (user.id !== clientId && user.id !== providerId) return;
  const other = user.id === clientId ? providerId : clientId;

  await prisma.chatBlock
    .upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: other } },
      create: { blockerId: user.id, blockedId: other },
      update: {},
    })
    .catch((e) => console.error("blockUser failed", e));

  revalidatePath(`/messages/${threadId}`);
}

// Снять блокировку.
export async function unblockUser(threadId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/messages/${threadId}`);
  const user = await ensureDbUser(authUser, await getLocale());

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: { booking: { select: { clientId: true, providerId: true } } },
  });
  if (!thread?.booking) return;
  const { clientId, providerId } = thread.booking;
  if (user.id !== clientId && user.id !== providerId) return;
  const other = user.id === clientId ? providerId : clientId;

  await prisma.chatBlock.deleteMany({ where: { blockerId: user.id, blockedId: other } });
  revalidatePath(`/messages/${threadId}`);
}

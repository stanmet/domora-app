"use server";

// Подписки на регулярные визиты: клиент выбирает услугу и частоту (неделя/
// 2 недели/месяц), получает скидку. Это MVP-заявка на регулярность; списание
// по расписанию появится позже (docs/domora-spec.md). Требует входа.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";

export type Freq = "weekly" | "biweekly" | "monthly";
const FREQS: Freq[] = ["weekly", "biweekly", "monthly"];

// RRULE (iCalendar) для выбранной частоты.
function rruleFor(freq: Freq): string {
  if (freq === "weekly") return "FREQ=WEEKLY;INTERVAL=1";
  if (freq === "biweekly") return "FREQ=WEEKLY;INTERVAL=2";
  return "FREQ=MONTHLY;INTERVAL=1";
}

export async function createSubscription(listingId: string, providerId: string, formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/providers/${providerId}`);
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);

  const freqRaw = String(formData.get("freq") ?? "weekly");
  const freq: Freq = FREQS.includes(freqRaw as Freq) ? (freqRaw as Freq) : "weekly";

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) redirect(`/providers/${providerId}`);

  // Одна активная подписка на услугу от клиента.
  const existing = await prisma.subscription.findFirst({
    where: { clientId: user.id, listingId, status: "active" },
    select: { id: true },
  });
  if (existing) {
    await prisma.subscription.update({ where: { id: existing.id }, data: { rrule: rruleFor(freq) } });
  } else {
    await prisma.subscription.create({
      data: { clientId: user.id, listingId, rrule: rruleFor(freq), status: "active" },
    });
  }

  revalidatePath("/account");
  revalidatePath(`/providers/${providerId}`);
}

export async function cancelSubscription(id: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/account");
  const locale = await getLocale();
  const user = await ensureDbUser(authUser, locale);

  const sub = await prisma.subscription.findUnique({ where: { id }, select: { clientId: true } });
  if (!sub || sub.clientId !== user.id) return;

  await prisma.subscription.update({ where: { id }, data: { status: "cancelled" } });
  revalidatePath("/account");
}

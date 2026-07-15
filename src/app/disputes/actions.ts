"use server";

// Центр споров (docs/domora-spec.md 6.1). Этап "договоритесь сами": исполнитель
// предлагает возврат 20% или 50%, заказчик принимает в один клик. Любая сторона
// может передать спор в поддержку (арбитраж). Площадка не навязывает решение.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus, DisputeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { refundToClient } from "@/lib/cancellation";
import { notify } from "@/lib/notify";

async function loadDispute(disputeId: string) {
  return prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { booking: { select: { id: true, clientId: true, providerId: true, totalCents: true } } },
  });
}

// Исполнитель предлагает возврат части суммы.
export async function proposeResolution(disputeId: string, kind: "refund20" | "refund50"): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/disputes/${disputeId}`);
  const user = await ensureDbUser(authUser, await getLocale());

  const dispute = await loadDispute(disputeId);
  if (!dispute?.booking || dispute.booking.providerId !== user.id || dispute.status !== DisputeStatus.NEGOTIATION) {
    revalidatePath(`/disputes/${disputeId}`);
    return;
  }

  const pct = kind === "refund20" ? 20 : 50;
  const cents = Math.round((dispute.booking.totalCents * pct) / 100);
  await prisma.dispute.update({ where: { id: disputeId }, data: { resolutionCode: kind, resolutionCents: cents } });
  await notify(dispute.booking.clientId, "dispute", { bookingId: dispute.booking.id, offer: pct });
  revalidatePath(`/disputes/${disputeId}`);
}

// Заказчик принимает предложение: возврат проводится, спор закрыт, заказ закрыт.
export async function acceptResolution(disputeId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/disputes/${disputeId}`);
  const user = await ensureDbUser(authUser, await getLocale());

  const dispute = await loadDispute(disputeId);
  if (
    !dispute?.booking ||
    dispute.booking.clientId !== user.id ||
    dispute.status !== DisputeStatus.NEGOTIATION ||
    !dispute.resolutionCents
  ) {
    revalidatePath(`/disputes/${disputeId}`);
    return;
  }

  try {
    await refundToClient(dispute.booking.id, dispute.resolutionCents, "dispute_agreed");
    await prisma.$transaction([
      prisma.dispute.update({ where: { id: disputeId }, data: { status: DisputeStatus.RESOLVED } }),
      prisma.booking.update({ where: { id: dispute.booking.id }, data: { status: BookingStatus.CLOSED } }),
      prisma.bookingEvent.create({
        data: {
          bookingId: dispute.booking.id,
          actorId: user.id,
          type: "status_change",
          payload: { to: BookingStatus.CLOSED, reason: "dispute_agreed", amountCents: dispute.resolutionCents },
        },
      }),
    ]);
  } catch (e) {
    console.error("acceptResolution failed", disputeId, e);
    revalidatePath(`/disputes/${disputeId}`);
    return;
  }

  await notify(dispute.booking.providerId, "dispute", { bookingId: dispute.booking.id, resolved: true });
  revalidatePath(`/disputes/${disputeId}`);
  revalidatePath("/bookings");
  revalidatePath("/pro/bookings");
}

// Любая сторона передаёт спор в поддержку (арбитраж).
export async function escalateDispute(disputeId: string): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/disputes/${disputeId}`);
  const user = await ensureDbUser(authUser, await getLocale());

  const dispute = await loadDispute(disputeId);
  if (!dispute?.booking || (dispute.booking.clientId !== user.id && dispute.booking.providerId !== user.id)) return;
  if (dispute.status !== DisputeStatus.NEGOTIATION) {
    revalidatePath(`/disputes/${disputeId}`);
    return;
  }

  await prisma.dispute.update({ where: { id: disputeId }, data: { status: DisputeStatus.ARBITRATION } });
  const other = user.id === dispute.booking.clientId ? dispute.booking.providerId : dispute.booking.clientId;
  await notify(other, "dispute", { bookingId: dispute.booking.id, escalated: true });
  revalidatePath(`/disputes/${disputeId}`);
  revalidatePath("/admin");
}

// Сообщение в деле спора (описание, аргументы).
export async function postDisputeMessage(disputeId: string, formData: FormData): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/disputes/${disputeId}`);
  const user = await ensureDbUser(authUser, await getLocale());

  const dispute = await loadDispute(disputeId);
  if (!dispute?.booking || (dispute.booking.clientId !== user.id && dispute.booking.providerId !== user.id)) return;

  const text = String(formData.get("text") ?? "").trim().slice(0, 2000);
  if (!text) return;
  await prisma.disputeMessage.create({ data: { disputeId, authorId: user.id, text } });
  revalidatePath(`/disputes/${disputeId}`);
}

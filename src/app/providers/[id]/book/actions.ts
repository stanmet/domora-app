"use server";

// Создание запроса брони без платежей: Booking в статусе REQUESTED,
// запись в BookingEvent, срок ответа исполнителя 72 часа.
// Stripe (холд на карте) подключается отдельным этапом и добавится сюда позже.
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { encrypt } from "@/lib/crypto";
import { calcBooking } from "@/lib/stripe";
import { qtyConfig, REQUEST_TTL_HOURS } from "@/lib/booking-units";

export type BookingFormState = { error?: string };

export async function createBookingRequest(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const locale = await getLocale();
  const t = getDict(locale);

  const listingId = String(formData.get("listingId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  const address = String(formData.get("address") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");
  const user = await ensureDbUser(authUser, locale);

  if (!listingId || !date || !time || !address || !Number.isInteger(qty) || qty < 1) {
    return { error: t.errForm };
  }

  const dateStart = new Date(`${date}T${time}`);
  if (Number.isNaN(dateStart.getTime())) return { error: t.errForm };
  if (dateStart.getTime() <= Date.now()) return { error: t.errPast };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { category: true, provider: true },
  });
  if (
    !listing ||
    listing.status !== "ACTIVE" ||
    listing.provider.status !== "ACTIVE" ||
    listing.quoteFirst ||
    listing.unit === "FIXED_QUOTE" ||
    listing.priceCents <= 0
  ) {
    return { error: t.errListing };
  }
  if (listing.providerId === user.id) return { error: t.errSelf };
  if (qty < qtyConfig(listing.unit).min) return { error: t.errForm };

  const money = calcBooking(
    listing.priceCents,
    qty,
    Number(listing.category.clientFeePct),
    Number(listing.category.providerFeePct),
  );

  try {
    await prisma.booking.create({
      data: {
        clientId: user.id,
        providerId: listing.providerId,
        listingId: listing.id,
        status: BookingStatus.REQUESTED,
        dateStart,
        qty,
        unit: listing.unit,
        priceCentsSnapshot: listing.priceCents,
        subtotalCents: money.subtotal,
        clientFeeCents: money.clientFee,
        providerFeeCents: money.providerFee,
        totalCents: money.total,
        addressEncrypted: encrypt(address),
        requestExpiresAt: new Date(Date.now() + REQUEST_TTL_HOURS * 3600 * 1000),
        events: {
          create: { actorId: user.id, type: "status_change", payload: { to: BookingStatus.REQUESTED } },
        },
        thread: {
          create: message
            ? { messages: { create: { authorId: user.id, textOriginal: message, langOriginal: locale } } }
            : {},
        },
      },
    });
  } catch (e) {
    console.error("createBookingRequest failed", e);
    return { error: t.errGeneric };
  }

  redirect("/bookings?sent=1");
}

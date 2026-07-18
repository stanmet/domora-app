"use server";

// Серверные экшены сайта для бронирования - тонкие обёртки над единым ядром
// src/lib/booking-create.ts (то же ядро использует REST API мобильного).
// Здесь только аутентификация и перевод кодов ошибок в тексты словаря.
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import type { Locale } from "@/i18n/config";
import {
  createBookingHold,
  finalizeBookingHold,
  type BookingErrorCode,
} from "@/lib/booking-create";

export type BookingRequestInput = {
  listingId: string;
  date: string;
  time: string;
  qty: number;
  address: string;
  message: string;
  couponCode?: string;
  draftBookingId?: string;
};

export type BookingRequestResult = { error: string } | { bookingId: string; clientSecret: string };

function errorText(code: BookingErrorCode, locale: Locale): string {
  const t = getDict(locale);
  const x = getExtra(locale);
  const map: Record<BookingErrorCode, string> = {
    form: t.errForm,
    past: t.errPast,
    listing: t.errListing,
    self: t.errSelf,
    slot: x.slotTaken,
    unavailable: t.errUnavailable,
    rate: x.tooMany,
    generic: t.errGeneric,
  };
  return map[code];
}

export async function createBookingRequest(input: BookingRequestInput): Promise<BookingRequestResult> {
  const locale = await getLocale();
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");
  const user = await ensureDbUser(authUser, locale);

  const res = await createBookingHold(user.id, user.email, locale, input);
  if ("error" in res) return { error: errorText(res.error, locale) };
  return res;
}

export type FinalizeResult = { error?: string };

export async function finalizeBookingPayment(bookingId: string): Promise<FinalizeResult> {
  const locale = await getLocale();
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/bookings");
  const user = await ensureDbUser(authUser, locale);

  const res = await finalizeBookingHold(bookingId, user.id);
  if ("error" in res) return { error: res.error === "pay" ? getDict(locale).errPay : getDict(locale).errGeneric };
  return {};
}

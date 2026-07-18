"use client";

// Форма запроса брони. Разметка и стили из prototypes/Marketplace.jsx (view "booking"):
// дата, время, количество со степпером, адрес, сообщение, расчет стоимости
// и шаг оплаты Stripe Elements. Порядок отправки: elements.submit() ->
// server action создает бронь и холд -> confirmPayment (3DS при необходимости) ->
// finalizeBookingPayment переводит бронь в REQUESTED.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import type { Appearance, StripeElementLocale } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Clock, CreditCard, Flower2, MessageCircle, PartyPopper, Ruler, ShieldCheck, Users } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";
import { qtyFieldLabel, unitLabel } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { eur } from "@/lib/format";
import { qtyConfig } from "@/lib/booking-units";
import { isWithinSchedule, minToHHMM } from "@/lib/availability-core";
import { track } from "@/lib/analytics";
import { createBookingRequest, finalizeBookingPayment } from "./actions";

export type BookableListing = {
  id: string;
  title: string;
  priceCents: number;
  unit: string;
  clientFeePct: number;
};

const UNIT_ICONS: Record<string, typeof Users> = {
  PER_GUEST: Users,
  PER_M2: Ruler,
  PER_HOUR: Clock,
  PER_SESSION: Flower2,
  PER_EVENT: PartyPopper,
};

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

// Палитра дизайн-системы из globals.css для полей Stripe Elements.
const APPEARANCE: Appearance = {
  variables: {
    colorPrimary: "#4C7C3F",
    colorText: "#141414",
    colorDanger: "#c23b22",
    colorBackground: "#ffffff",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "12px",
  },
};

// Украинского в Stripe Elements нет, для него берем язык браузера.
const STRIPE_LOCALES: Partial<Record<Locale, StripeElementLocale>> = {
  en: "en",
  ru: "ru",
  pl: "pl",
  es: "es",
  pt: "pt",
};

function totalFor(listing: BookableListing, qty: number): number {
  const subtotal = listing.priceCents * qty;
  return subtotal + Math.round((subtotal * listing.clientFeePct) / 100);
}

export type BookingCoupon = { code: string; pct: number } | null;

export type Availability = {
  workDays: number[];
  workStartMin: number;
  workEndMin: number;
  blockedDays: string[]; // ключи YYYY-MM-DD
};

export default function BookingForm(props: {
  listings: BookableListing[];
  defaultListingId: string;
  coupon: BookingCoupon;
  avail: Availability;
  t: Dict;
  locale: Locale;
}) {
  const listing = props.listings.find((l) => l.id === props.defaultListingId) ?? props.listings[0];
  const initialFull = totalFor(listing, qtyConfig(listing.unit).def);
  const initialAmount = props.coupon
    ? Math.max(initialFull - Math.round((initialFull * props.coupon.pct) / 100), 0)
    : initialFull;

  if (!stripePromise) return <div className="err">{props.t.payUnavailable}</div>;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: initialAmount,
        currency: "eur",
        captureMethod: "manual",
        paymentMethodTypes: ["card"],
        appearance: APPEARANCE,
        locale: STRIPE_LOCALES[props.locale] ?? "auto",
      }}
    >
      <InnerForm {...props} />
    </Elements>
  );
}

function InnerForm({
  listings,
  defaultListingId,
  coupon,
  avail,
  t,
  locale,
}: {
  listings: BookableListing[];
  defaultListingId: string;
  coupon: BookingCoupon;
  avail: Availability;
  t: Dict;
  locale: Locale;
}) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [listingId, setListingId] = useState(defaultListingId);
  const listing = listings.find((l) => l.id === listingId) ?? listings[0];
  const cfg = qtyConfig(listing.unit);
  const [qty, setQty] = useState(cfg.def);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Бронь неудачной попытки оплаты: при повторной отправке переиспользуется.
  const [draftBookingId, setDraftBookingId] = useState<string | undefined>(undefined);

  const subtotal = listing.priceCents * qty;
  const fee = Math.round((subtotal * listing.clientFeePct) / 100);
  const gross = subtotal + fee;
  const discount = coupon ? Math.round((gross * coupon.pct) / 100) : 0;
  const total = Math.max(gross - discount, 0);
  const UnitIcon = UNIT_ICONS[listing.unit] ?? Users;
  const today = new Date().toISOString().slice(0, 10);

  // Доступность выбранного слота по расписанию исполнителя (авторитетно всё
  // равно проверяет сервер; здесь - подсказка и блокировка кнопки).
  const blockedSet = new Set(avail.blockedDays);
  const schedule = { workDays: avail.workDays, workStartMin: avail.workStartMin, workEndMin: avail.workEndMin };
  const slotChosen = Boolean(date && time);
  const slotOk = !slotChosen || isWithinSchedule(schedule, new Date(`${date}T${time}:00Z`), blockedSet);
  const workFrom = minToHHMM(avail.workStartMin);
  const workTo = minToHHMM(avail.workEndMin);

  // Сумма холда в Stripe Elements следует за количеством, услугой и скидкой.
  useEffect(() => {
    elements?.update({ amount: total });
  }, [elements, total]);

  const pickListing = (id: string) => {
    setListingId(id);
    const next = listings.find((l) => l.id === id);
    if (next) setQty(qtyConfig(next.unit).def);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements || pending) return;
    setPending(true);
    setError(null);
    try {
      // Валидация полей карты; свои ошибки PaymentElement показывает сам.
      const submitted = await elements.submit();
      if (submitted.error) return;

      const res = await createBookingRequest({ listingId: listing.id, date, time, qty, address, message, couponCode: coupon?.code, draftBookingId });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDraftBookingId(res.bookingId);

      const confirmed = await stripe.confirmPayment({
        elements,
        clientSecret: res.clientSecret,
        confirmParams: { return_url: `${window.location.origin}/bookings?sent=1` },
        redirect: "if_required",
      });
      if (confirmed.error) {
        setError(confirmed.error.message ?? t.errPay);
        return;
      }

      const fin = await finalizeBookingPayment(res.bookingId);
      if (fin.error) {
        setError(fin.error);
        return;
      }
      track("booking_created");
      track("payment_success");
      router.push("/bookings?sent=1");
    } catch (err) {
      console.error("booking payment failed", err);
      setError(t.errGeneric);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      {listings.length > 1 && (
        <>
          <label>{t.sumService}</label>
          <select className="f" value={listing.id} onChange={(e) => pickListing(e.target.value)}>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} · {eur(l.priceCents, locale)} / {unitLabel(t, l.unit)}
              </option>
            ))}
          </select>
        </>
      )}

      <label>{t.dateL}</label>
      <input className="f" type="date" name="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
      <label>{t.timeL}</label>
      <input className="f" type="time" name="time" min={workFrom} max={workTo} value={time} onChange={(e) => setTime(e.target.value)} required />
      {slotChosen && !slotOk && <div className="err" style={{ marginTop: 6 }}>{t.errUnavailable}</div>}

      <label>{qtyFieldLabel(t, listing.unit)}</label>
      <div className="stepper">
        <button type="button" onClick={() => setQty(Math.max(cfg.min, qty - cfg.step))}>
          −
        </button>
        <div className="val">{qty}</div>
        <button type="button" onClick={() => setQty(qty + cfg.step)}>
          +
        </button>
        <span className="unit">
          <UnitIcon size={14} />
          {eur(listing.priceCents, locale)} / {unitLabel(t, listing.unit)}
        </span>
      </div>

      <label>{t.addrL}</label>
      <input className="f" name="address" placeholder={t.addrPh} value={address} onChange={(e) => setAddress(e.target.value)} required />
      <label>{t.msgL}</label>
      <textarea className="f" name="message" rows={3} placeholder={t.msgPh} value={message} onChange={(e) => setMessage(e.target.value)} />

      <div className="brk">
        <div className="row">
          <span>
            {t.sumService} × {qty}
          </span>
          <span>{eur(subtotal, locale)}</span>
        </div>
        <div className="row">
          <span>
            {t.sumFee} {listing.clientFeePct}%
          </span>
          <span>{eur(fee, locale)}</span>
        </div>
        {coupon && discount > 0 && (
          <div className="row" style={{ color: "var(--green)" }}>
            <span>
              {t.couponL} {coupon.code} · -{coupon.pct}%
            </span>
            <span>-{eur(discount, locale)}</span>
          </div>
        )}
        <div className="row total">
          <span>{t.sumTotal}</span>
          <span>{eur(total, locale)}</span>
        </div>
      </div>

      <label>{t.payL}</label>
      <div className="paybox">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <div className="hold">
        <CreditCard size={16} /> {t.payHold}
      </div>

      <div className="hold">
        <ShieldCheck size={16} /> {t.bNote}
      </div>
      <div className="hold">
        <MessageCircle size={16} /> {t.sideNote}
      </div>

      {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}

      <button
        type="submit"
        className="btn btn-green"
        disabled={pending || !stripe || !elements || !slotOk}
        style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
      >
        {pending ? t.bSending : `${t.bSend} · ${eur(total, locale)}`}
      </button>
    </form>
  );
}

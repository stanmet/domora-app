"use client";

// Форма запроса брони. Разметка и стили из prototypes/Marketplace.jsx (view "booking"):
// дата, время, количество со степпером, адрес, сообщение и расчет стоимости.
import { useActionState, useState } from "react";
import { Clock, Flower2, MessageCircle, PartyPopper, Ruler, ShieldCheck, Users } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";
import { qtyFieldLabel, unitLabel } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { eur } from "@/lib/format";
import { qtyConfig } from "@/lib/booking-units";
import { createBookingRequest, type BookingFormState } from "./actions";

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

export default function BookingForm({
  listings,
  defaultListingId,
  t,
  locale,
}: {
  listings: BookableListing[];
  defaultListingId: string;
  t: Dict;
  locale: Locale;
}) {
  const [listingId, setListingId] = useState(defaultListingId);
  const listing = listings.find((l) => l.id === listingId) ?? listings[0];
  const cfg = qtyConfig(listing.unit);
  const [qty, setQty] = useState(cfg.def);
  // Контролируемые поля: после ошибки серверной проверки (например, прошедшее
  // время) React 19 сбрасывает обычную форму, а введенное должно сохраняться.
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [state, formAction, pending] = useActionState<BookingFormState, FormData>(createBookingRequest, {});

  const subtotal = listing.priceCents * qty;
  const fee = Math.round((subtotal * listing.clientFeePct) / 100);
  const total = subtotal + fee;
  const UnitIcon = UNIT_ICONS[listing.unit] ?? Users;
  const today = new Date().toISOString().slice(0, 10);

  const pickListing = (id: string) => {
    setListingId(id);
    const next = listings.find((l) => l.id === id);
    if (next) setQty(qtyConfig(next.unit).def);
  };

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="listingId" value={listing.id} />
      <input type="hidden" name="qty" value={qty} />

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
      <input className="f" type="time" name="time" value={time} onChange={(e) => setTime(e.target.value)} required />

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
        <div className="row total">
          <span>{t.sumTotal}</span>
          <span>{eur(total, locale)}</span>
        </div>
      </div>

      <div className="hold">
        <ShieldCheck size={16} /> {t.bNote}
      </div>
      <div className="hold">
        <MessageCircle size={16} /> {t.sideNote}
      </div>

      {state.error && <div className="err">{state.error}</div>}

      <button
        type="submit"
        className="btn btn-green"
        disabled={pending}
        style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
      >
        {pending ? t.bSending : `${t.bSend} · ${eur(total, locale)}`}
      </button>
    </form>
  );
}

"use client";

// Оплата брони по отклику: сумма фиксирована (цена из отклика + сервисный сбор).
// Порядок: elements.submit() -> createTaskHold создаёт холд -> confirmPayment
// (3DS при необходимости) -> finalizeBookingPayment переводит бронь в REQUESTED.
// Переиспользует финализацию из обычного флоу брони.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import type { Appearance, StripeElementLocale } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CreditCard, ShieldCheck } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { eur } from "@/lib/format";
import { finalizeBookingPayment } from "@/app/providers/[id]/book/actions";
import { createTaskHold } from "./actions";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

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

const STRIPE_LOCALES: Partial<Record<Locale, StripeElementLocale>> = {
  en: "en",
  ru: "ru",
  pl: "pl",
  es: "es",
  pt: "pt",
};

export type CheckoutProps = {
  bookingId: string;
  title: string;
  subtotalCents: number;
  clientFeeCents: number;
  totalCents: number;
  t: Dict;
  locale: Locale;
};

export default function TaskCheckout(props: CheckoutProps) {
  if (!stripePromise) return <div className="err">{props.t.payUnavailable}</div>;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: props.totalCents,
        currency: "eur",
        captureMethod: "manual",
        // Способы оплаты не перечисляем: сервер создаёт PaymentIntent с
        // automatic_payment_methods (карта + Apple Pay/Google Pay). Если задать
        // здесь paymentMethodTypes, конфиги клиента и сервера разойдутся и
        // confirmPayment упадёт с ошибкой несовместимости.
        appearance: APPEARANCE,
        locale: STRIPE_LOCALES[props.locale] ?? "auto",
      }}
    >
      <InnerForm {...props} />
    </Elements>
  );
}

function InnerForm({ bookingId, title, subtotalCents, clientFeeCents, totalCents, t, locale }: CheckoutProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements || pending) return;
    setPending(true);
    setError(null);
    try {
      const submitted = await elements.submit();
      if (submitted.error) return;

      const res = await createTaskHold(bookingId);
      if ("error" in res) {
        setError(res.error);
        return;
      }

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

      const fin = await finalizeBookingPayment(bookingId);
      if (fin.error) {
        setError(fin.error);
        return;
      }
      router.push("/bookings?sent=1");
    } catch (err) {
      console.error("task checkout failed", err);
      setError(t.errGeneric);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="brk" style={{ marginTop: 8 }}>
        <div className="row">
          <span>{title}</span>
          <span>{eur(subtotalCents, locale)}</span>
        </div>
        <div className="row">
          <span>{t.sumFee}</span>
          <span>{eur(clientFeeCents, locale)}</span>
        </div>
        <div className="row total">
          <span>{t.sumTotal}</span>
          <span>{eur(totalCents, locale)}</span>
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
        <ShieldCheck size={16} /> {t.paySub}
      </div>

      {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}

      <button
        type="submit"
        className="btn btn-green"
        disabled={pending || !stripe || !elements}
        style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
      >
        {pending ? t.bSending : `${t.payBtn} · ${eur(totalCents, locale)}`}
      </button>
    </form>
  );
}

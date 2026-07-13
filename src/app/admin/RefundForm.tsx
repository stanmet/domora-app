"use client";

// Кнопка "Вернуть" раскрывает форму возврата: сумма в евро или галка "вся сумма".
// Возврат идет через Stripe (server action refundBooking).
import { useState, useTransition } from "react";
import { refundBooking } from "./actions";
import type { AdminDict } from "./i18n";

export default function RefundForm({
  bookingId,
  remainingEuros,
  t,
}: {
  bookingId: string;
  remainingEuros: string;
  t: AdminDict;
}) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(true);
  const [amount, setAmount] = useState(remainingEuros);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await refundBooking(bookingId, full ? "full" : Number(amount));
      if ("error" in res) setError(res.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button className="btn btn-red btn-sm" onClick={() => setOpen(true)}>
        {t.refund}
      </button>
    );
  }

  return (
    <div className="adm-inline">
      <label className="adm-check">
        <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> {t.refundFull}
      </label>
      {!full && (
        <>
          <label className="adm-lbl">{t.refundAmount}</label>
          <input
            className="f"
            type="number"
            min="0.5"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </>
      )}
      <p className="adm-note">{t.refundNote}</p>
      {error && <div className="err">{error}</div>}
      <div className="adm-inline-btns">
        <button className="btn btn-red btn-sm" disabled={pending} onClick={submit}>
          {t.refundBtn}
        </button>
        <button className="btn btn-line btn-sm" onClick={() => setOpen(false)} disabled={pending}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

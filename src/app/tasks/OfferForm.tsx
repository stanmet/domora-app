"use client";

// Форма отклика исполнителя на задачу: цена и сообщение. Раскрывается по кнопке
// "Откликнуться". После успешной отправки показывает подтверждение.
// Контакты в тексте фильтруются на сервере (createOffer).
import { useActionState, useEffect, useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";
import { createOffer, type OfferState } from "./actions";

export default function OfferForm({ taskId, t }: { taskId: string; t: Dict }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<OfferState, FormData>(createOffer, null);
  const done = state && "ok" in state;

  useEffect(() => {
    if (done) setOpen(false);
  }, [done]);

  if (done) {
    return (
      <div className="offer-sent">
        <Check size={15} /> {t.offerSent}
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-green btn-sm" onClick={() => setOpen(true)}>
        <MessageCircle size={14} /> {t.respond}
      </button>
    );
  }

  return (
    <form action={formAction} className="offer-form">
      <input type="hidden" name="taskId" value={taskId} />
      <label htmlFor={`price-${taskId}`}>{t.offerPriceL}</label>
      <input id={`price-${taskId}`} name="price" className="f" type="number" min="1" step="0.01" required />
      <label htmlFor={`msg-${taskId}`}>{t.offerMsgL}</label>
      <textarea id={`msg-${taskId}`} name="message" className="f" rows={3} placeholder={t.offerMsgPh} maxLength={800} required />
      {state && "error" in state && <div className="err">{state.error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="submit" className="btn btn-green btn-sm" style={{ flex: 1, justifyContent: "center" }} disabled={pending}>
          {pending ? t.bSending : t.offerSend}
        </button>
        <button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(false)}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

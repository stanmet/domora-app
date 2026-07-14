"use client";

// Кнопка "Отклонить" раскрывает поле причины. Причина уходит исполнителю
// в moderationNote и видна ему в разделе "Мои услуги".
import { useState, useTransition } from "react";
import { rejectListing } from "./actions";
import type { AdminDict } from "./i18n";

export default function RejectForm({ listingId, t }: { listingId: string; t: AdminDict }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button className="btn btn-red btn-sm" onClick={() => setOpen(true)}>
        {t.reject}
      </button>
    );
  }

  return (
    <div className="adm-inline">
      <label className="adm-lbl">{t.rejectReason}</label>
      <textarea
        className="f"
        rows={2}
        value={reason}
        placeholder={t.rejectPlaceholder}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="adm-inline-btns">
        <button
          className="btn btn-red btn-sm"
          disabled={pending}
          onClick={() => start(() => rejectListing(listingId, reason))}
        >
          {t.submit}
        </button>
        <button className="btn btn-line btn-sm" onClick={() => setOpen(false)} disabled={pending}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

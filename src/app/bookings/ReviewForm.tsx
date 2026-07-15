"use client";

// Форма отзыва заказчика: выбор звёзд (1..5) и необязательный текст.
// Используется и для создания, и для редактирования отзыва. Разворачивается
// по кнопке, чтобы не загромождать карточку заказа.
import { useState } from "react";
import { Star, Pencil, Trash2 } from "lucide-react";
import { track } from "@/lib/analytics";

export type ReviewFormLabels = {
  leave: string;
  editTitle: string;
  edit: string;
  del: string;
  submit: string;
  save: string;
  placeholder: string;
  rateL: string;
  needStars: string;
};

export default function ReviewForm({
  submitAction,
  editAction,
  deleteAction,
  existing,
  labels,
}: {
  submitAction: (formData: FormData) => Promise<void>;
  editAction: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
  existing: { stars: number; text: string | null } | null;
  labels: ReviewFormLabels;
}) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Свёрнутый вид: либо кнопка "оставить отзыв", либо показ своего отзыва.
  if (!open) {
    if (existing) {
      return (
        <div className="review" style={{ marginTop: 10 }}>
          <div className="rr">
            {labels.editTitle}
            <span className="stars">
              {Array.from({ length: existing.stars }).map((_, j) => (
                <Star key={j} size={12} fill="currentColor" />
              ))}
            </span>
          </div>
          {existing.text && <p>{existing.text}</p>}
          <div className="bkbtns" style={{ marginTop: 6 }}>
            <button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(true)}>
              <Pencil size={13} /> {labels.edit}
            </button>
            <form action={deleteAction}>
              <button className="btn btn-line btn-sm">
                <Trash2 size={13} /> {labels.del}
              </button>
            </form>
          </div>
        </div>
      );
    }
    return (
      <button type="button" className="btn btn-green btn-sm" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>
        <Star size={14} /> {labels.leave}
      </button>
    );
  }

  return (
    <form
      className="dispute-form"
      action={async (fd) => {
        if (stars < 1) {
          setError(labels.needStars);
          return;
        }
        fd.set("stars", String(stars));
        if (existing) await editAction(fd);
        else {
          await submitAction(fd);
          track("review_left", { stars });
        }
        setOpen(false);
      }}
    >
      <b>{labels.rateL}</b>
      <div className="starpick" style={{ display: "flex", gap: 4, margin: "4px 0 8px" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n}`}
            onClick={() => {
              setStars(n);
              setError(null);
            }}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#f5a623" }}
          >
            <Star size={24} fill={(hover || stars) >= n ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <textarea className="f" name="text" rows={3} maxLength={1000} placeholder={labels.placeholder} defaultValue={existing?.text ?? ""} />
      {error && <div className="err">{error}</div>}
      <button className="btn btn-green btn-sm">{existing ? labels.save : labels.submit}</button>
    </form>
  );
}

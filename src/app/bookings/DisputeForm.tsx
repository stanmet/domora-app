"use client";

// Кнопка "Пожаловаться" разворачивается в форму с описанием проблемы.
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function DisputeForm({
  action,
  labels,
}: {
  action: (formData: FormData) => void;
  labels: { open: string; title: string; ph: string; send: string };
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(true)}>
        <AlertTriangle size={14} /> {labels.open}
      </button>
    );
  }

  return (
    <form action={action} className="dispute-form">
      <b>{labels.title}</b>
      <textarea className="f" name="reason" rows={3} placeholder={labels.ph} />
      <button className="btn btn-red btn-sm">{labels.send}</button>
    </form>
  );
}

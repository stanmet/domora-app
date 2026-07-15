"use client";

// Кнопка опасного действия с шагом подтверждения: сначала показывает
// предупреждение, потом форму-подтверждение. Используется для отмены заказа.
import { useState, type ReactNode } from "react";

export default function ConfirmAction({
  action,
  label,
  warning,
  confirmLabel,
  backLabel,
  icon,
}: {
  action: (formData: FormData) => void;
  label: string;
  warning: string;
  confirmLabel: string;
  backLabel: string;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(true)}>
        {icon} {label}
      </button>
    );
  }

  return (
    <div className="confirm-box">
      <p>{warning}</p>
      <div className="confirm-row">
        <form action={action}>
          <button className="btn btn-red btn-sm">{confirmLabel}</button>
        </form>
        <button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(false)}>
          {backLabel}
        </button>
      </div>
    </div>
  );
}

"use client";

// Управление карантином исполнителя (для админа). Если исполнитель не в карантине -
// кнопка «Карантин» раскрывает поле причины и отправляет. Если уже в карантине -
// показываем причину и кнопку «Снять карантин». Серверные действия приходят
// пропсами уже привязанными к нужному исполнителю.
import { useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export type QuarantineLabels = {
  qBtn: string;
  qLift: string;
  qReasonPh: string;
  qSend: string;
  qStatusTag: string;
  cancel: string;
};

export default function QuarantineControl({
  quarantined,
  reason,
  quarantineAction,
  liftAction,
  labels,
}: {
  quarantined: boolean;
  reason?: string | null;
  quarantineAction: (formData: FormData) => Promise<void>;
  liftAction: () => Promise<void>;
  labels: QuarantineLabels;
}) {
  const [open, setOpen] = useState(false);

  if (quarantined) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
        <span className="pill dec">{labels.qStatusTag}</span>
        {reason && <span className="adm-muted" style={{ fontSize: 12 }}>{reason}</span>}
        <form action={liftAction}>
          <button className="btn btn-green btn-sm" type="submit">
            <ShieldCheck size={14} /> {labels.qLift}
          </button>
        </form>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="btn btn-line btn-sm" type="button" onClick={() => setOpen(true)}>
        <ShieldAlert size={14} /> {labels.qBtn}
      </button>
    );
  }

  return (
    <form action={quarantineAction} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
      <textarea name="reason" className="f" rows={2} placeholder={labels.qReasonPh} maxLength={500} style={{ width: "100%", resize: "vertical" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-red btn-sm" type="submit">{labels.qSend}</button>
        <button className="btn btn-line btn-sm" type="button" onClick={() => setOpen(false)}>{labels.cancel}</button>
      </div>
    </form>
  );
}

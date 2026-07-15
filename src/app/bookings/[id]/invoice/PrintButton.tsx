"use client";

// Кнопка печати/сохранения инвойса в PDF (через диалог печати браузера).
import { Printer } from "lucide-react";

export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-ink no-print" onClick={() => window.print()}>
      <Printer size={16} /> {label}
    </button>
  );
}

"use client";

// Подсказка по установке на iPhone (Apple не разрешает установку по клику).
// Через портал в body: иначе окажется внутри бокового меню (у него transform
// создаёт свой слой) и её перекроют другие плашки.
import { createPortal } from "react-dom";
import { Plus, Share, X } from "lucide-react";

export type IosSheetLabels = {
  iosTitle: string;
  iosStep1: string;
  iosStep2: string;
  close: string;
};

export default function InstallIosSheet({ labels, onClose }: { labels: IosSheetLabels; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="install-sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="install-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="install-sheet-x" onClick={onClose} aria-label={labels.close}>
          <X size={18} />
        </button>
        <h3>{labels.iosTitle}</h3>
        <div className="install-step">
          <span className="install-ic">
            <Share size={18} />
          </span>
          <p>{labels.iosStep1}</p>
        </div>
        <div className="install-step">
          <span className="install-ic">
            <Plus size={18} />
          </span>
          <p>{labels.iosStep2}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

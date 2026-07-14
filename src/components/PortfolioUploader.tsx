"use client";

// Загрузчик фото портфолио: показывает текущие фото с кнопкой удаления и
// плитку выбора файлов. Серверные действия (добавить/удалить) приходят пропсами
// уже привязанными к нужной цели (профиль или конкретная услуга).
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

export type UploaderLabels = { add: string; remove: string; full: string; hint: string };

export default function PortfolioUploader({
  photos,
  max,
  addAction,
  removeAction,
  labels,
}: {
  photos: string[];
  max: number;
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (formData: FormData) => Promise<void>;
  labels: UploaderLabels;
}) {
  const remaining = max - photos.length;
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="uploader">
      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((url) => (
            <div className="thumb" key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              <form action={removeAction}>
                <input type="hidden" name="url" value={url} />
                <button className="rm" aria-label={labels.remove} type="submit">
                  <X size={14} />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 ? (
        <form
          ref={formRef}
          action={async (fd) => {
            setBusy(true);
            try {
              await addAction(fd);
            } finally {
              setBusy(false);
              formRef.current?.reset();
            }
          }}
        >
          <label className="filepick">
            {busy ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
            {labels.add}
            <input
              type="file"
              name="photos"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              disabled={busy}
              onChange={(e) => {
                if (e.currentTarget.files?.length) e.currentTarget.form?.requestSubmit();
              }}
            />
          </label>
        </form>
      ) : (
        <div className="hint">{labels.full}</div>
      )}

      <div className="hint">{labels.hint.replace("{n}", String(Math.max(remaining, 0)))}</div>
    </div>
  );
}

"use client";

// Загрузчик фото портфолио: показывает текущие фото с кнопкой удаления и плитку
// выбора файлов. Перед отправкой фото сжимаются в браузере (быстро и экономно),
// показывается прогресс. Серверные действия (добавить/удалить) приходят пропсами
// уже привязанными к нужной цели (профиль или конкретная услуга).
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { compressImage } from "@/lib/compress-image";

export type UploaderLabels = { add: string; remove: string; full: string; hint: string; uploading: string };

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function onFiles(fileList: FileList) {
    const files = Array.from(fileList).slice(0, remaining);
    if (files.length === 0) return;
    setBusy(true);
    setProgress({ done: 0, total: files.length });
    try {
      // Сжимаем по очереди (чтобы не грузить память телефона) и показываем прогресс.
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        const out = await compressImage(files[i]);
        fd.append("photos", out, out.name);
        setProgress({ done: i + 1, total: files.length });
      }
      // Отправка на сервер (там фото уходят в хранилище параллельно).
      await addAction(fd);
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busyLabel = progress
    ? labels.uploading.replace("{n}", `${progress.done}/${progress.total}`)
    : labels.uploading.replace("{n}", "");

  return (
    <div className="uploader">
      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((url) => (
            <div className="thumb" key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" decoding="async" />
              <form action={removeAction}>
                <input type="hidden" name="url" value={url} />
                <button className="rm" aria-label={labels.remove} type="submit" disabled={busy}>
                  <X size={14} />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 ? (
        <label className={"filepick" + (busy ? " busy" : "")}>
          {busy ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
          {busy ? busyLabel : labels.add}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={busy}
            onChange={(e) => {
              if (e.currentTarget.files?.length) onFiles(e.currentTarget.files);
            }}
          />
        </label>
      ) : (
        <div className="hint">{labels.full}</div>
      )}

      <div className="hint">{labels.hint.replace("{n}", String(Math.max(remaining, 0)))}</div>
    </div>
  );
}

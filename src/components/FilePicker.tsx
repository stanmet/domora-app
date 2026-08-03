"use client";

// Локализованный выбор файла. Родной <input type="file"> рисует текст «Выбрать
// файл / файл не выбран» на языке браузера/телефона, а не сайта. Поэтому родной
// инпут прячем (остаётся рабочим и отправляется в форме), а показываем свою
// кнопку и имя выбранного файла на языке интерфейса.
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { compressImage } from "@/lib/compress-image";

export default function FilePicker({
  name,
  id,
  accept,
  multiple = false,
  required = false,
  chooseLabel,
  noneLabel,
  manyLabel,
  onFiles,
  compressImages = false,
  onProcessing,
}: {
  name: string;
  id?: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  chooseLabel: string; // «Выбрать файл»
  noneLabel: string; // «Файл не выбран»
  manyLabel?: string; // «Файлов: {n}» - для выбора нескольких
  onFiles?: (files: FileList | null) => void;
  compressImages?: boolean; // сжимать выбранные фото в браузере до отправки
  onProcessing?: (busy: boolean) => void; // сообщить форме, что идёт обработка (блокировать отправку)
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="filepicker">
      <button type="button" className="btn btn-line btn-sm" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} {chooseLabel}
      </button>
      <span className="filepicker-name">{text || noneLabel}</span>
      <input
        ref={ref}
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        className="filepicker-input"
        onChange={async (e) => {
          let files = e.target.files;
          // Сжимаем фото в браузере и подменяем содержимое инпута сжатыми файлами,
          // чтобы форма отправила уже лёгкие версии (быстрее загрузка).
          if (compressImages && files && files.length && typeof DataTransfer !== "undefined") {
            setBusy(true);
            onProcessing?.(true);
            try {
              const dt = new DataTransfer();
              for (const f of Array.from(files)) dt.items.add(await compressImage(f));
              if (ref.current) {
                ref.current.files = dt.files;
                files = ref.current.files;
              }
            } catch {
              // не получилось - оставляем оригиналы
            } finally {
              setBusy(false);
              onProcessing?.(false);
            }
          }
          if (!files || files.length === 0) setText("");
          else if (files.length === 1) setText(files[0].name);
          else setText((manyLabel ?? "{n}").replace("{n}", String(files.length)));
          onFiles?.(files);
        }}
      />
    </div>
  );
}

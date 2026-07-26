"use client";

// Локализованный выбор файла. Родной <input type="file"> рисует текст «Выбрать
// файл / файл не выбран» на языке браузера/телефона, а не сайта. Поэтому родной
// инпут прячем (остаётся рабочим и отправляется в форме), а показываем свою
// кнопку и имя выбранного файла на языке интерфейса.
import { useRef, useState } from "react";
import { Upload } from "lucide-react";

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
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");

  return (
    <div className="filepicker">
      <button type="button" className="btn btn-line btn-sm" onClick={() => ref.current?.click()}>
        <Upload size={15} /> {chooseLabel}
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
        onChange={(e) => {
          const files = e.target.files;
          if (!files || files.length === 0) setText("");
          else if (files.length === 1) setText(files[0].name);
          else setText((manyLabel ?? "{n}").replace("{n}", String(files.length)));
          onFiles?.(files);
        }}
      />
    </div>
  );
}

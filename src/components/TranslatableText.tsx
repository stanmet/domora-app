"use client";

// Показ пользовательского текста на языке читателя с пометкой об автопереводе.
// Если текст переведён, под ним появляется строка "Переведено с X · показать
// оригинал" с переключателем. Если перевод не потребовался, просто текст.
import { useState } from "react";
import { Languages } from "lucide-react";

export type TrLabels = { from: string; showOriginal: string; showTranslation: string };

type Tag = "p" | "h1" | "h2" | "h3" | "h4" | "div" | "span";

export default function TranslatableText({
  display,
  original,
  translated,
  sourceLangName,
  labels,
  as = "p",
  className,
  style,
}: {
  display: string;
  original: string;
  translated: boolean;
  sourceLangName: string;
  labels: TrLabels;
  as?: Tag;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [showOrig, setShowOrig] = useState(false);
  const Tag = as as keyof React.JSX.IntrinsicElements;

  if (!translated) {
    return (
      <Tag className={className} style={style}>
        {display}
      </Tag>
    );
  }

  return (
    <>
      <Tag className={className} style={style}>
        {showOrig ? original : display}
      </Tag>
      <button type="button" className="tr-note" onClick={() => setShowOrig((v) => !v)}>
        <Languages size={12} /> {labels.from} {sourceLangName} · {showOrig ? labels.showTranslation : labels.showOriginal}
      </button>
    </>
  );
}

"use client";

// Кнопка «N · Все фото» на обложке профиля открывает полноэкранную галерею
// (лайтбокс) со всеми фото исполнителя: листание стрелками/свайпом, счётчик,
// закрытие по фону, крестику или Esc. Раньше счётчик был обычным текстом и по
// нажатию ничего не происходило.
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

export default function PhotoGallery({ photos, label, alt }: { photos: string[]; label: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(() => setIdx((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % photos.length), [photos.length]);

  // Клавиатура: Esc закрывает, стрелки листают.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    // Пока галерея открыта, страница под ней не прокручивается.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next]);

  // Свайп по горизонтали на телефоне.
  const [touchX, setTouchX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (dx > 40) prev();
    else if (dx < -40) next();
    setTouchX(null);
  };

  return (
    <>
      <button type="button" className="phero-count" onClick={() => { setIdx(0); setOpen(true); }}>
        <Images size={13} /> {photos.length} · {label}
      </button>

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={close}>
          <button type="button" className="lb-btn lb-close" onClick={close} aria-label="Close">
            <X size={22} />
          </button>
          {photos.length > 1 && (
            <button
              type="button"
              className="lb-btn lb-prev"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous"
            >
              <ChevronLeft size={26} />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[idx]}
            alt={alt}
            className="lb-img"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          />
          {photos.length > 1 && (
            <button
              type="button"
              className="lb-btn lb-next"
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next"
            >
              <ChevronRight size={26} />
            </button>
          )}
          <div className="lb-count">{idx + 1} / {photos.length}</div>
        </div>
      )}
    </>
  );
}

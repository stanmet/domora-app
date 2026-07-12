"use client";

// Переключатель языка в шапке. Пишет cookie "locale" и перерисовывает
// серверные страницы через router.refresh().
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LANG_NAMES, LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";

export default function LangSwitcher({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="langwrap" ref={ref}>
      <button className="lang" onClick={() => setOpen(!open)} aria-label="Language">
        <Globe size={14} /> {locale.toUpperCase()}
      </button>
      {open && (
        <div className="langmenu">
          {LOCALES.map((l) => (
            <button key={l} className={locale === l ? "on" : ""} onClick={() => pick(l)}>
              {LANG_NAMES[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

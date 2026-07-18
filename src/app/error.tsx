"use client";

// Перехватчик ошибок уровня страницы: в отличие от global-error, оставляет
// шапку и навигацию из корневого layout, подменяя только контент. Ловит
// непойманные исключения клиентских компонентов внутри дерева страниц.
import { useEffect } from "react";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/config";

const TEXT: Record<Locale, { title: string; body: string; retry: string }> = {
  en: { title: "Something went wrong", body: "This section failed to load. Please try again.", retry: "Try again" },
  ru: { title: "Что-то пошло не так", body: "Раздел не загрузился. Попробуйте ещё раз.", retry: "Повторить" },
  uk: { title: "Щось пішло не так", body: "Розділ не завантажився. Спробуйте ще раз.", retry: "Повторити" },
  pl: { title: "Coś poszło nie tak", body: "Nie udało się załadować sekcji. Spróbuj ponownie.", retry: "Spróbuj ponownie" },
  es: { title: "Algo salió mal", body: "Esta sección no se cargó. Inténtalo de nuevo.", retry: "Reintentar" },
  pt: { title: "Algo correu mal", body: "Esta secção não carregou. Tente novamente.", retry: "Tentar de novo" },
};

function readLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const c = m ? decodeURIComponent(m[1]) : "en";
  return (LOCALES as readonly string[]).includes(c) ? (c as Locale) : "en";
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("page error boundary:", error);
    if (/ChunkLoadError|Loading chunk|dynamically imported module/i.test(error.message)) {
      window.location.reload();
    }
  }, [error]);

  const t = TEXT[readLocale()];

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", textAlign: "center", padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t.title}</h1>
      <p style={{ fontSize: 15, color: "#5b5b5b", marginBottom: 20 }}>{t.body}</p>
      <button type="button" onClick={() => reset()} className="btn btn-green" style={{ justifyContent: "center" }}>
        {t.retry}
      </button>
    </div>
  );
}

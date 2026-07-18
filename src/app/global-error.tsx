"use client";

// Верхний перехватчик ошибок: срабатывает, когда падает даже корневой layout.
// Заменяет собой всё дерево, поэтому рендерит собственные <html>/<body>.
// Без него любое непойманное исключение на клиенте показывает системный белый
// экран Next «Application error». Частый случай на Vercel - ChunkLoadError:
// после нового деплоя открытая вкладка тянет старый чанк, которого уже нет;
// перезагрузка страницы всё чинит.
import { useEffect } from "react";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/config";

// Сообщение на языке читателя. Здесь нельзя взять серверный словарь (компонент
// клиентский и рендерится вне обычного потока), поэтому короткие тексты держим
// рядом. Длинное тире не используем.
const TEXT: Record<Locale, { title: string; body: string; retry: string }> = {
  en: { title: "Something went wrong", body: "The page failed to load. Please reload.", retry: "Reload" },
  ru: { title: "Что-то пошло не так", body: "Страница не загрузилась. Обновите её.", retry: "Обновить" },
  uk: { title: "Щось пішло не так", body: "Сторінка не завантажилась. Оновіть її.", retry: "Оновити" },
  pl: { title: "Coś poszło nie tak", body: "Nie udało się załadować strony. Odśwież ją.", retry: "Odśwież" },
  es: { title: "Algo salió mal", body: "La página no se cargó. Vuelve a cargarla.", retry: "Recargar" },
  pt: { title: "Algo correu mal", body: "A página não carregou. Recarregue.", retry: "Recarregar" },
};

function readLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const c = m ? decodeURIComponent(m[1]) : "en";
  return (LOCALES as readonly string[]).includes(c) ? (c as Locale) : "en";
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("global error boundary:", error);
    // Устаревший чанк после деплоя чинится только полной перезагрузкой.
    if (/ChunkLoadError|Loading chunk|dynamically imported module/i.test(error.message)) {
      window.location.reload();
    }
  }, [error]);

  const t = TEXT[readLocale()];

  return (
    <html>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#141414",
          background: "#ffffff",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t.title}</h1>
          <p style={{ fontSize: 15, color: "#5b5b5b", marginBottom: 20 }}>{t.body}</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#4C7C3F",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px 22px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  );
}

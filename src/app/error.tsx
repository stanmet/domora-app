"use client";

// Экран на случай непредвиденной ошибки на странице (error boundary Next.js).
// Обязан быть клиентским компонентом (использует reset), поэтому язык берём из
// cookie `locale`, а короткие тексты держим здесь же - серверный словарь в
// клиентский бандл тянуть ради трёх строк не нужно.
import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";

const T = {
  en: { title: "Something went wrong", text: "An unexpected error occurred. Please try again, or go back to the homepage.", retry: "Try again", home: "Go to homepage" },
  ru: { title: "Что-то пошло не так", text: "Произошла непредвиденная ошибка. Попробуйте ещё раз или вернитесь на главную.", retry: "Попробовать снова", home: "На главную" },
  uk: { title: "Щось пішло не так", text: "Сталася непередбачувана помилка. Спробуйте ще раз або поверніться на головну.", retry: "Спробувати ще раз", home: "На головну" },
  pl: { title: "Coś poszło nie tak", text: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub wróć na stronę główną.", retry: "Spróbuj ponownie", home: "Strona główna" },
  es: { title: "Algo salió mal", text: "Se produjo un error inesperado. Inténtalo de nuevo o vuelve a la página de inicio.", retry: "Intentar de nuevo", home: "Ir al inicio" },
  pt: { title: "Algo correu mal", text: "Ocorreu um erro inesperado. Tente novamente ou volte à página inicial.", retry: "Tentar novamente", home: "Página inicial" },
} as const;

function pickLocale(): keyof typeof T {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  const l = m?.[1];
  return l && l in T ? (l as keyof typeof T) : "en";
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Ошибку логируем для диагностики (видно в логах Vercel).
    console.error(error);
  }, [error]);

  const t = T[pickLocale()];

  return (
    <main className="wrap sec" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
      <div className="display" style={{ fontSize: "clamp(48px,14vw,96px)", color: "var(--orange)", lineHeight: 1 }}>!</div>
      <h1 className="page" style={{ marginTop: 8 }}>{t.title}</h1>
      <p className="sub">{t.text}</p>
      <div className="cta" style={{ justifyContent: "center", marginTop: 8 }}>
        <button onClick={reset} className="btn btn-ink" type="button">
          <RotateCcw size={16} /> {t.retry}
        </button>
        <Link href="/" className="btn btn-ghost">
          <Home size={16} /> {t.home}
        </Link>
      </div>
    </main>
  );
}

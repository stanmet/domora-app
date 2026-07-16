"use client";

// Тонкая обёртка над Plausible для продуктовой аналитики. Безопасна без
// подключённой аналитики: если window.plausible нет, вызовы просто игнорируются.
// События: signup, login, booking_created, payment_success, booking_cancelled, review_left.
declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export function track(event: string, props?: Record<string, string | number | boolean>): void {
  try {
    if (typeof window !== "undefined" && typeof window.plausible === "function") {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch {
    // аналитика не должна влиять на работу приложения
  }
}

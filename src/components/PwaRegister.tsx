"use client";

// 1) Регистрирует service worker (/sw.js) - нужен, чтобы сайт можно было
//    установить как приложение и показать запасной экран без сети.
// 2) Перехватывает системное событие установки (beforeinstallprompt) как можно
//    раньше и сохраняет его на window, чтобы кнопка "Установить приложение" в
//    меню могла вызвать установку в один тап (Android/Chrome). Об изменениях
//    сообщаем через собственные события pwa-can-install / pwa-installed.
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // service worker
    if ("serviceWorker" in navigator) {
      const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
      if (document.readyState === "complete") onLoad();
      else window.addEventListener("load", onLoad, { once: true });
    }

    // перехват системного предложения установки
    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __pwaPrompt?: Event }).__pwaPrompt = e;
      window.dispatchEvent(new Event("pwa-can-install"));
    };
    const onInstalled = () => {
      (window as unknown as { __pwaPrompt?: Event | null }).__pwaPrompt = null;
      window.dispatchEvent(new Event("pwa-installed"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}

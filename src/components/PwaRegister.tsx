"use client";

// Регистрирует service worker (/sw.js) на клиенте. Нужен, чтобы сайт можно было
// установить как приложение и показать запасной экран при отсутствии сети.
// Регистрация тихая: любые ошибки (например, приватный режим) просто игнорируем.
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);
  return null;
}

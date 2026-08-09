"use client";

// Общая логика установки PWA для пункта меню и нижней плашки.
// - canPrompt: доступна системная установка (Android/Chrome) - можно вызвать окно.
// - isIos: iPhone/iPad, где Apple запрещает программную установку (покажем подсказку).
// - standalone: приложение уже открыто как установленное - установку не предлагаем.
// Событие установки перехватывает PwaRegister и кладёт в window.__pwaPrompt.
import { useCallback, useEffect, useState } from "react";

type PromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
};

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

export function usePwaInstall() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(true); // до проверки прячем

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    setStandalone(isStandalone);

    const ua = navigator.userAgent || "";
    const ios =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPad на iPadOS
    setIsIos(ios);

    if ((window as unknown as { __pwaPrompt?: Event }).__pwaPrompt) setCanPrompt(true);
    const onCan = () => setCanPrompt(true);
    const onInstalled = () => {
      setCanPrompt(false);
      setStandalone(true);
    };
    window.addEventListener("pwa-can-install", onCan);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-can-install", onCan);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    const evt = (window as unknown as { __pwaPrompt?: PromptEvent | null }).__pwaPrompt;
    if (evt) {
      evt.prompt();
      try {
        const { outcome } = await evt.userChoice;
        (window as unknown as { __pwaPrompt?: Event | null }).__pwaPrompt = null;
        setCanPrompt(false);
        return outcome === "accepted" ? "accepted" : "dismissed";
      } catch {
        return "dismissed";
      }
    }
    return "unavailable";
  }, []);

  // Показывать предложение установки вообще имеет смысл, только если не установлено
  // и есть путь: системная установка (Android) или это iPhone (покажем инструкцию).
  const available = !standalone && (canPrompt || isIos);

  return { available, canPrompt, isIos, standalone, promptInstall };
}

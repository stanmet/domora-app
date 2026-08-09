"use client";

// Пункт меню "Установить приложение".
// - Android/Chrome: по клику показываем системное окно установки (в один тап).
// - iPhone/Safari: программная установка запрещена Apple, поэтому по клику
//   показываем короткую инструкцию "Поделиться -> На экран Домой".
// - Если приложение уже открыто как установленное (standalone) или установка
//   недоступна (обычный десктоп-браузер без поддержки) - пункт не показываем.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Plus, Share, X } from "lucide-react";

type InstallLabels = {
  install: string;
  iosTitle: string;
  iosStep1: string;
  iosStep2: string;
  close: string;
};

type PromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
};

export default function InstallApp({ labels, onDone }: { labels: InstallLabels; onDone?: () => void }) {
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(true); // до проверки прячем, чтобы не мигало
  const [sheet, setSheet] = useState(false);

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

  // Уже установлено - не показываем. Иначе показываем, если есть системная
  // установка (Android) или это iPhone (покажем инструкцию).
  if (standalone) return null;
  if (!canPrompt && !isIos) return null;

  const onClick = async () => {
    const evt = (window as unknown as { __pwaPrompt?: PromptEvent | null }).__pwaPrompt;
    if (evt) {
      evt.prompt();
      try {
        await evt.userChoice;
      } catch {
        // пользователь закрыл окно - ничего страшного
      }
      (window as unknown as { __pwaPrompt?: Event | null }).__pwaPrompt = null;
      setCanPrompt(false);
      onDone?.();
    } else if (isIos) {
      setSheet(true);
    }
  };

  return (
    <>
      <button type="button" className="drawer-link accent" onClick={onClick}>
        <Download size={18} /> {labels.install}
      </button>

      {sheet &&
        createPortal(
          // Через портал в body: иначе подсказка оказывается внутри бокового меню
          // (у него transform создаёт свой слой) и её перекрывают другие плашки.
          <div className="install-sheet-backdrop" onClick={() => setSheet(false)} role="dialog" aria-modal="true">
            <div className="install-sheet" onClick={(e) => e.stopPropagation()}>
              <button className="install-sheet-x" onClick={() => setSheet(false)} aria-label={labels.close}>
                <X size={18} />
              </button>
              <h3>{labels.iosTitle}</h3>
              <div className="install-step">
                <span className="install-ic">
                  <Share size={18} />
                </span>
                <p>{labels.iosStep1}</p>
              </div>
              <div className="install-step">
                <span className="install-ic">
                  <Plus size={18} />
                </span>
                <p>{labels.iosStep2}</p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

"use client";

// Ненавязчивая нижняя плашка "Установить Domora как приложение".
// Показывается только при ПОВТОРНОМ заходе (со второго визита), с небольшой
// задержкой и не одновременно с баннером cookie. Крестик закрывает её на 30
// дней. Если приложение уже установлено или установка недоступна - не
// показываем. Клик по "Установить": Android - системное окно, iPhone - подсказка.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePwaInstall } from "./usePwaInstall";
import InstallIosSheet from "./InstallIosSheet";

type BannerLabels = {
  text: string;
  cta: string;
  close: string;
  iosTitle: string;
  iosStep1: string;
  iosStep2: string;
};

const VISIT_KEY = "domora_visits";
const SESSION_KEY = "domora_session_counted";
const DISMISS_KEY = "domora_install_dismissed";
const DISMISS_DAYS = 30;

function cookieChoiceMade(): boolean {
  return typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith("cookie_consent="));
}

export default function InstallBanner({ labels }: { labels: BannerLabels }) {
  const { available, isIos, promptInstall } = usePwaInstall();
  const [show, setShow] = useState(false);
  const [sheet, setSheet] = useState(false);

  // Считаем визиты - один раз за сессию браузера.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, "1");
        const v = Number(localStorage.getItem(VISIT_KEY) || "0") + 1;
        localStorage.setItem(VISIT_KEY, String(v));
      }
    } catch {
      // приватный режим без хранилища - просто не показываем плашку
    }
  }, []);

  // Решаем, показывать ли: со второго визита, если не закрыта недавно и выбор
  // по cookie уже сделан (чтобы две нижние плашки не наложились).
  useEffect(() => {
    if (!available) {
      setShow(false);
      return;
    }
    try {
      const visits = Number(localStorage.getItem(VISIT_KEY) || "0");
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
      const dismissedRecently = dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DAYS * 864e5;
      if (visits >= 2 && !dismissedRecently && cookieChoiceMade()) {
        const t = setTimeout(() => setShow(true), 3500);
        return () => clearTimeout(t);
      }
    } catch {
      // нет доступа к хранилищу - не показываем
    }
  }, [available]);

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // игнорируем
    }
  };

  const onInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "unavailable" && isIos) {
      setSheet(true);
    } else {
      // системное окно показано (Android) - плашку убираем, чтобы не мозолила
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="install-banner" role="region" aria-label={labels.text}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="install-banner-ic" width={40} height={40} />
        <div className="install-banner-txt">{labels.text}</div>
        <button type="button" className="btn btn-green btn-sm" onClick={onInstall}>
          {labels.cta}
        </button>
        <button type="button" className="install-banner-x" onClick={close} aria-label={labels.close}>
          <X size={18} />
        </button>
      </div>

      {sheet && (
        <InstallIosSheet
          labels={{ iosTitle: labels.iosTitle, iosStep1: labels.iosStep1, iosStep2: labels.iosStep2, close: labels.close }}
          onClose={() => {
            setSheet(false);
            close();
          }}
        />
      )}
    </>
  );
}

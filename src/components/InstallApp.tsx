"use client";

// Пункт меню "Установить приложение".
// - Android/Chrome: по клику показываем системное окно установки (в один тап).
// - iPhone/Safari: по клику показываем короткую инструкцию (Apple запрещает
//   программную установку).
// - Если приложение уже установлено или установка недоступна - пункт скрыт.
import { useState } from "react";
import { Download } from "lucide-react";
import { usePwaInstall } from "./usePwaInstall";
import InstallIosSheet from "./InstallIosSheet";

type InstallLabels = {
  install: string;
  iosTitle: string;
  iosStep1: string;
  iosStep2: string;
  close: string;
};

export default function InstallApp({ labels, onDone }: { labels: InstallLabels; onDone?: () => void }) {
  const { available, isIos, promptInstall } = usePwaInstall();
  const [sheet, setSheet] = useState(false);

  if (!available) return null;

  const onClick = async () => {
    const outcome = await promptInstall();
    if (outcome === "unavailable" && isIos) setSheet(true);
    else onDone?.();
  };

  return (
    <>
      <button type="button" className="drawer-link accent" onClick={onClick}>
        <Download size={18} /> {labels.install}
      </button>

      {sheet && (
        <InstallIosSheet
          labels={{ iosTitle: labels.iosTitle, iosStep1: labels.iosStep1, iosStep2: labels.iosStep2, close: labels.close }}
          onClose={() => setSheet(false)}
        />
      )}
    </>
  );
}

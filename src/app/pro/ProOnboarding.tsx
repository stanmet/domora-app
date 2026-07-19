"use client";

// Онбординг-чеклист исполнителя (V1 без оплаты): первая услуга и доступность.
// Шаг услуги закрывается, когда у исполнителя реально есть плашка в БД; кнопка
// ведёт в раздел "Мои услуги". Шаг календаря ведёт на страницу расписания.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar as CalIcon, Check, Home, Lightbulb, Rocket } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";

type StepKey = "listing" | "avail";

export default function ProOnboarding({
  t,
  listingDone,
}: {
  t: Dict;
  listingDone: boolean;
}) {
  const router = useRouter();
  const [availDone, setAvailDone] = useState(false);

  const steps: Record<StepKey, boolean> = {
    listing: listingDone,
    avail: availDone,
  };

  const doneCount = Object.values(steps).filter(Boolean).length;
  const pct = Math.round((doneCount / 2) * 100);
  const nextKey: StepKey | null = !steps.listing ? "listing" : !steps.avail ? "avail" : null;

  function stepAction(key: StepKey) {
    if (key === "listing") return router.push("/pro/services");
    // Шаг доступности ведёт на реальную страницу расписания.
    setAvailDone(true);
    router.push("/pro/availability");
  }

  const stepDefs: { key: StepKey; label: string; icon: typeof Home }[] = [
    { key: "listing", label: t.obSt2, icon: Home },
    { key: "avail", label: t.obSt3, icon: CalIcon },
  ];

  return (
    <>
      {pct < 100 && (
        <div className="card">
          <div className="ob-head">
            <div className="icircle or">
              <Rocket size={22} strokeWidth={1.7} />
            </div>
            <div>
              <h3>{t.obT}</h3>
              <p>{t.obP}</p>
            </div>
          </div>
          <div className="prog">
            <span>{t.obProgress}</span>
            <b>{pct}%</b>
          </div>
          <div className="bar">
            <i style={{ width: pct + "%" }} />
          </div>
          {stepDefs.map((s, i) => {
            const done = steps[s.key];
            const isNext = s.key === nextKey;
            return (
              <div key={s.key} className={"ob-step" + (isNext ? " next" : "") + (done ? " ok" : "")}>
                <div className={"num" + (done ? " ok" : "")}>{done ? <Check size={15} /> : i + 1}</div>
                <h4>
                  {s.label}
                  {isNext && <span className="tagnext">{t.obNext}</span>}
                </h4>
                {done ? (
                  <span className="donel">{t.obDone}</span>
                ) : (
                  <button className="btn btn-ink btn-sm" onClick={() => stepAction(s.key)}>
                    {t.obGo} <ArrowRight size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="tip">
        <div className="ti">
          <Lightbulb size={18} />
        </div>
        <p>
          <b>{t.proTipB}</b> {t.proTip}
        </p>
      </div>
    </>
  );
}

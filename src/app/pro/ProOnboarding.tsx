"use client";

// Онбординг-чеклист исполнителя из prototypes/HostDashboard.jsx:
// Stripe, первая услуга, доступность. Шаг Stripe рабочий: кнопка запускает
// онбординг Connect Express (POST /api/connect/onboard) и уводит на Stripe;
// после возврата шаг закрывается по payoutsEnabled из БД (вебхук account.updated
// плюс сверка на /pro?onboarded=1). Шаги услуг и календаря пока как в прототипе.
import { useState } from "react";
import { ArrowRight, Calendar as CalIcon, Check, Home, Lightbulb, Rocket, Wallet } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";

type StepKey = "stripe" | "listing" | "avail";

export default function ProOnboarding({
  t,
  stripeDone,
  listingDone,
}: {
  t: Dict;
  stripeDone: boolean;
  listingDone: boolean;
}) {
  const [localSteps, setLocalSteps] = useState<Record<StepKey, boolean>>({
    stripe: false,
    listing: false,
    avail: false,
  });
  const [stripePending, setStripePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: Record<StepKey, boolean> = {
    stripe: stripeDone,
    listing: listingDone || localSteps.listing,
    avail: localSteps.avail,
  };

  const doneCount = Object.values(steps).filter(Boolean).length;
  const pct = Math.round((doneCount / 3) * 100);
  const nextKey: StepKey | null = !steps.stripe ? "stripe" : !steps.listing ? "listing" : !steps.avail ? "avail" : null;

  // Онбординг Connect Express: получаем ссылку и уходим на Stripe.
  async function startStripeOnboarding() {
    setStripePending(true);
    setError(null);
    try {
      const res = await fetch("/api/connect/onboard", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!res.ok || !data?.url) throw new Error(`onboard failed: ${res.status}`);
      window.location.assign(data.url);
    } catch (e) {
      console.error(e);
      setError(t.errGeneric);
      setStripePending(false);
    }
  }

  function stepAction(key: StepKey) {
    if (key === "stripe") return startStripeOnboarding();
    setLocalSteps({ ...localSteps, [key]: true });
  }

  const stepDefs: { key: StepKey; label: string; icon: typeof Wallet }[] = [
    { key: "stripe", label: t.obSt1, icon: Wallet },
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
                  <button
                    className="btn btn-ink btn-sm"
                    disabled={s.key === "stripe" && stripePending}
                    onClick={() => stepAction(s.key)}
                  >
                    {s.key === "stripe" && stripePending ? t.bSending : t.obGo} <ArrowRight size={13} />
                  </button>
                )}
              </div>
            );
          })}
          {error && <div className="err">{error}</div>}
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

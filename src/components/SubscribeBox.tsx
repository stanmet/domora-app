// Плашка подписки на регулярные визиты на странице исполнителя. Клиент
// выбирает частоту и подписывается со скидкой. Форма работает без JS.
import { CalendarClock } from "lucide-react";

export type SubBoxLabels = {
  title: string;
  desc: string;
  weekly: string;
  biweekly: string;
  monthly: string;
  subscribe: string;
  off: string;
};

export default function SubscribeBox({
  action,
  labels,
  priceLine,
  discountPct,
}: {
  action: (formData: FormData) => void;
  labels: SubBoxLabels;
  priceLine: string;
  discountPct: number;
}) {
  return (
    <form className="subbox" action={action}>
      <div className="subbox-head">
        <CalendarClock size={16} />
        <b>{labels.title}</b>
      </div>
      <p className="subbox-desc">{labels.desc}</p>
      <div className="subbox-price">
        {priceLine} · <span className="subbox-off">-{discountPct}% {labels.off}</span>
      </div>
      <select name="freq" className="subbox-select" defaultValue="weekly">
        <option value="weekly">{labels.weekly}</option>
        <option value="biweekly">{labels.biweekly}</option>
        <option value="monthly">{labels.monthly}</option>
      </select>
      <button className="btn btn-line" style={{ width: "100%", justifyContent: "center" }}>
        {labels.subscribe}
      </button>
    </form>
  );
}

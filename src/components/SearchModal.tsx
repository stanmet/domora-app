"use client";

// Разворачивающийся поиск: что нужно, категория, город, дата, бюджет.
// Две кнопки - "Разместить задачу" (в форму с предзаполнением) и "Найти
// исполнителя" (в каталог). Выбранный город сохраняется глобально (cookie).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";

// Имя cookie города (дублируем строкой, чтобы не тянуть server-only lib/city).
const CITY_COOKIE = "city";

export default function SearchModal({
  open,
  onClose,
  t,
  categories,
  cities,
  currentCity,
}: {
  open: boolean;
  onClose: () => void;
  t: Dict;
  categories: { slug: string; label: string }[];
  cities: string[];
  currentCity: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [city, setCity] = useState(currentCity);
  const [date, setDate] = useState("");
  const [bf, setBf] = useState("");
  const [bt, setBt] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const saveCity = () => {
    document.cookie = `${CITY_COOKIE}=${encodeURIComponent(city)}; path=/; max-age=31536000; samesite=lax`;
  };

  const go = (base: string, withTask: boolean) => {
    saveCity();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (cat) p.set("cat", cat);
    if (city) p.set("city", city);
    if (withTask) {
      if (date) p.set("date", date);
      if (bf) p.set("bf", bf);
      if (bt) p.set("bt", bt);
    }
    onClose();
    const s = p.toString();
    router.push(s ? `${base}?${s}` : base);
  };

  return (
    <div className="smodal-back" onClick={onClose}>
      <div className="smodal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="smodal-head">
          <b>{t.searchTop}</b>
          <button className="burger" onClick={onClose} aria-label={t.close}>
            <X size={18} />
          </button>
        </div>

        <div className="form">
          <label htmlFor="sm-q">{t.taskWhatL}</label>
          <input id="sm-q" className="f" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.taskWhatPh} />

          <label htmlFor="sm-cat">{t.liCat}</label>
          <select id="sm-cat" className="f" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">{t.all}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>

          <label htmlFor="sm-city">{t.taskCityL}</label>
          <select id="sm-city" className="f" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">{t.cityAll}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label htmlFor="sm-date">{t.taskDateL}</label>
          <input id="sm-date" className="f" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />

          <label>{t.budgetLabel}</label>
          <div className="budgetrow">
            <input className="f" type="number" min="0" step="1" placeholder={t.fromCap} value={bf} onChange={(e) => setBf(e.target.value)} />
            <input className="f" type="number" min="0" step="1" placeholder={t.budgetToL} value={bt} onChange={(e) => setBt(e.target.value)} />
          </div>
        </div>

        <div className="smodal-cta">
          <button className="btn btn-green" onClick={() => go("/tasks/new", true)}>
            {t.postTask} <ArrowRight size={16} />
          </button>
          <button className="btn btn-ink" onClick={() => go("/catalog", false)}>
            {t.findPro} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

// Список услуг исполнителя и форма добавления из prototypes/HostDashboard.jsx
// (tab "listings"): кнопка "Добавить услугу" раскрывает sheet-форму, тумблер
// включает и выключает одобренную услугу (ACTIVE <-> PAUSED). Новая услуга
// уходит на модерацию, для нее вместо тумблера показывается статус.
import { useActionState, useEffect, useState } from "react";
import { Plus, ToggleLeft, ToggleRight } from "lucide-react";
import type { ListingStatus, PriceUnit } from "@prisma/client";
import type { Locale } from "@/i18n/config";
import { listingStatusLabel, unitLabel, unitOptionLabel, type Dict } from "@/i18n/dictionaries";
import { eur } from "@/lib/format";
import { createListing, toggleListing, type CreateListingState } from "./actions";

export type ListingRow = {
  id: string;
  title: string;
  professionLabel: string | null;
  priceCents: number;
  unit: PriceUnit;
  status: ListingStatus;
};

const FORM_UNITS: PriceUnit[] = ["PER_HOUR", "PER_EVENT", "PER_SESSION", "PER_GUEST", "PER_M2"];

export default function ServicesManager({
  listings,
  categories,
  subcategories = [],
  t,
  locale,
}: {
  listings: ListingRow[];
  categories: { slug: string; label: string }[];
  subcategories?: { slug: string; label: string; categorySlug: string }[];
  t: Dict;
  locale: Locale;
}) {
  const [adding, setAdding] = useState(false);
  const [cat, setCat] = useState(categories[0]?.slug ?? "");
  const [state, formAction, pending] = useActionState<CreateListingState, FormData>(createListing, null);
  const subOptions = subcategories.filter((s) => s.categorySlug === cat);

  // Успешное создание закрывает форму; поля сбрасываются размонтированием.
  useEffect(() => {
    if (state && "ok" in state) setAdding(false);
  }, [state]);

  return (
    <>
      {adding ? (
        <div className="sheet">
          <form action={formAction} className="form">
            <label htmlFor="svc-who">{t.liWho}</label>
            <input id="svc-who" name="who" className="f" placeholder={t.liWhoPh} maxLength={80} />
            <label htmlFor="svc-cat">{t.liCat}</label>
            <select id="svc-cat" name="category" className="f" value={cat} onChange={(e) => setCat(e.target.value)}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
            {subOptions.length > 0 && (
              <>
                <label htmlFor="svc-subcat">{t.liSubcat}</label>
                <select id="svc-subcat" name="subcategory" className="f" defaultValue="">
                  <option value="">—</option>
                  {subOptions.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label htmlFor="svc-title">{t.liTitle}</label>
            <input id="svc-title" name="title" className="f" placeholder={t.liTitlePh} maxLength={120} required />
            <label htmlFor="svc-desc">{t.liDesc}</label>
            <textarea id="svc-desc" name="description" className="f" placeholder={t.liDescPh} rows={3} maxLength={1000} />
            <label htmlFor="svc-price">{t.liPrice}</label>
            <input id="svc-price" name="price" className="f" type="number" min="0.5" step="0.01" required />
            <label htmlFor="svc-unit">{t.liUnit}</label>
            <select id="svc-unit" name="unit" className="f" defaultValue="PER_HOUR">
              {FORM_UNITS.map((u) => (
                <option key={u} value={u}>
                  {unitOptionLabel(t, u)}
                </option>
              ))}
            </select>
            {state && "error" in state && <div className="err">{state.error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="submit" className="btn btn-green" style={{ flex: 1, justifyContent: "center" }} disabled={pending}>
                {pending ? t.bSending : t.save}
              </button>
              <button type="button" className="btn btn-line" onClick={() => setAdding(false)}>
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button className="btn btn-ink" style={{ marginBottom: 8 }} onClick={() => setAdding(true)}>
          <Plus size={15} /> {t.addListing}
        </button>
      )}

      {listings.length === 0 && !adding && <div className="empty">{t.svcEmpty}</div>}

      {listings.map((l) => {
        const canToggle = l.status === "ACTIVE" || l.status === "PAUSED";
        const on = l.status === "ACTIVE";
        return (
          <div className="li" key={l.id}>
            <div style={{ flex: 1 }}>
              <h4>{l.professionLabel ? `${l.professionLabel} · ${l.title}` : l.title}</h4>
              {canToggle && <p>{listingStatusLabel(t, l.status)}</p>}
            </div>
            <div className="pr">
              {eur(l.priceCents, locale)} <span>/ {unitLabel(t, l.unit)}</span>
            </div>
            {canToggle ? (
              <form action={toggleListing.bind(null, l.id)}>
                <button className={"tgl" + (on ? "" : " off")} title={on ? t.liActive : t.liPaused}>
                  {on ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
                </button>
              </form>
            ) : (
              <span className={"pill " + (l.status === "MODERATION" ? "req" : "dec")}>
                {listingStatusLabel(t, l.status)}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

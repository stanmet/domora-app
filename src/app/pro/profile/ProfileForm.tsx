"use client";

// Форма профиля исполнителя. Показывает результат сохранения через useActionState.
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Dict } from "@/i18n/dictionaries";
import { IRELAND_TOWN_NAMES } from "@/lib/ireland";
import { updateProviderProfile, type ProfileState } from "./actions";

interface Values {
  displayName: string;
  customProfession: string;
  city: string;
  bio: string;
  travelRadiusKm: number;
  legalName: string;
  businessAddress: string;
  vatNumber: string;
}

interface TaxLabels {
  legalName: string;
  businessAddress: string;
  vatNumber: string;
  hint: string;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-green" disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

export default function ProfileForm({ t, values, tax }: { t: Dict; values: Values; tax: TaxLabels }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProviderProfile, null);
  return (
    <form action={action} className="pp-form">
      <label className="f-row">
        <span>{t.ppName}</span>
        <input name="displayName" defaultValue={values.displayName} required maxLength={80} />
      </label>
      <label className="f-row">
        <span>{t.ppProfession}</span>
        <input name="customProfession" defaultValue={values.customProfession} maxLength={60} />
      </label>
      <label className="f-row">
        <span>{t.ppCity}</span>
        <input name="city" defaultValue={values.city} required maxLength={60} list="ie-towns" />
        <datalist id="ie-towns">
          {IRELAND_TOWN_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>
      <label className="f-row">
        <span>{t.ppBio}</span>
        <textarea name="bio" defaultValue={values.bio} rows={4} maxLength={800} placeholder={t.ppBioHint} />
      </label>
      <label className="f-row">
        <span>{t.ppRadius}</span>
        <input type="number" name="travelRadiusKm" defaultValue={values.travelRadiusKm} min={1} max={500} step={5} />
        <small className="tu-muted">{t.ppRadiusHint}</small>
      </label>

      {/* Необязательные реквизиты для инвойса (налоговая). */}
      <label className="f-row">
        <span>{tax.legalName}</span>
        <input name="legalName" defaultValue={values.legalName} maxLength={120} />
      </label>
      <label className="f-row">
        <span>{tax.businessAddress}</span>
        <input name="businessAddress" defaultValue={values.businessAddress} maxLength={200} />
      </label>
      <label className="f-row">
        <span>{tax.vatNumber}</span>
        <input name="vatNumber" defaultValue={values.vatNumber} maxLength={40} />
        <small className="tu-muted">{tax.hint}</small>
      </label>

      <div style={{ marginTop: 14 }}>
        <SaveButton label={t.ppSave} />
      </div>
      {state && <div className={"tu-note " + (state.ok ? "ok" : "err")} style={{ marginTop: 12 }}>{state.msg}</div>}
    </form>
  );
}

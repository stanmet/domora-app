"use client";

// Форма профиля исполнителя. Показывает результат сохранения через useActionState.
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Dict } from "@/i18n/dictionaries";
import { updateProviderProfile, type ProfileState } from "./actions";

interface Values {
  displayName: string;
  customProfession: string;
  city: string;
  bio: string;
  travelRadiusKm: number;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-green" disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

export default function ProfileForm({ t, values }: { t: Dict; values: Values }) {
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
        <input name="city" defaultValue={values.city} required maxLength={60} />
      </label>
      <label className="f-row">
        <span>{t.ppBio}</span>
        <textarea name="bio" defaultValue={values.bio} rows={4} maxLength={800} placeholder={t.ppBioHint} />
      </label>
      <label className="f-row">
        <span>{t.ppRadius}</span>
        <input type="number" name="travelRadiusKm" defaultValue={values.travelRadiusKm} min={1} max={100} />
      </label>
      <div style={{ marginTop: 14 }}>
        <SaveButton label={t.ppSave} />
      </div>
      {state && <div className={"tu-note " + (state.ok ? "ok" : "err")} style={{ marginTop: 12 }}>{state.msg}</div>}
    </form>
  );
}

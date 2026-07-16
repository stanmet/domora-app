"use client";

// Редактирование личных данных и смена пароля в личном кабинете.
// Данные сохраняются серверным действием updateProfile; смена пароля идёт
// напрямую через Supabase (updateUser), сессия уже есть.
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { LANG_NAMES, LOCALES, type Locale } from "@/i18n/config";
import type { ExtraDict } from "@/i18n/extra";

export default function AccountForm({
  action,
  current,
  labels,
  savedFlag,
}: {
  action: (formData: FormData) => Promise<void>;
  current: { name: string; phone: string; locale: Locale };
  labels: ExtraDict & { nameL: string };
  savedFlag: boolean;
}) {
  const [pw, setPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    if (pw.length < 8) {
      setPwErr(labels.accPwWeak);
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await getSupabaseBrowser().auth.updateUser({ password: pw });
      if (error) setPwErr(labels.genericError);
      else {
        setPwMsg(labels.accPwChanged);
        setPw("");
      }
    } catch {
      setPwErr(labels.genericError);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <>
      <form className="form" action={action}>
        <h2 className="subs-title" style={{ marginTop: 4 }}>{labels.accEditTitle}</h2>
        <label htmlFor="name">{labels.nameL}</label>
        <input id="name" name="name" className="f" required defaultValue={current.name} placeholder={labels.accNamePh} />
        <label htmlFor="phone">{labels.accPhoneL}</label>
        <input id="phone" name="phone" className="f" defaultValue={current.phone} placeholder={labels.accPhonePh} />
        <label htmlFor="locale">{labels.accLangL}</label>
        <select id="locale" name="locale" className="f" defaultValue={current.locale}>
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LANG_NAMES[l]}
            </option>
          ))}
        </select>
        {savedFlag && <div className="ok-note" style={{ marginTop: 8, color: "var(--green, #1a7f37)" }}>{labels.accSaved}</div>}
        <button className="btn btn-ink" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
          {labels.accSave}
        </button>
      </form>

      <form className="form" onSubmit={changePassword} style={{ marginTop: 24 }}>
        <h2 className="subs-title">{labels.accSecurity}</h2>
        <label htmlFor="newpw">{labels.accNewPw}</label>
        <input
          id="newpw"
          className="f"
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={labels.accNewPwPh}
        />
        {pwErr && <div className="err">{pwErr}</div>}
        {pwMsg && <div className="ok-note" style={{ color: "var(--green, #1a7f37)" }}>{pwMsg}</div>}
        <button className="btn btn-line" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={pwBusy}>
          {pwBusy ? labels.saving : labels.accChangePw}
        </button>
      </form>
    </>
  );
}

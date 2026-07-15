"use client";

// Установка нового пароля. Ссылка из письма приводит сюда с кодом восстановления;
// обмениваем его на сессию, затем сохраняем новый пароль (updateUser).
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function ResetForm({
  labels,
}: {
  labels: {
    newPw: string;
    newPwPh: string;
    save: string;
    done: string;
    weak: string;
    noSession: string;
    error: string;
    saving: string;
  };
}) {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = getSupabaseBrowser();
      try {
        // Ссылка PKCE несёт ?code=...; обмениваем его на сессию восстановления.
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => {});
        const { data } = await supabase.auth.getSession();
        setHasSession(Boolean(data.session));
      } catch {
        setHasSession(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) {
      setError(labels.weak);
      return;
    }
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowser().auth.updateUser({ password: pw });
      if (error) setError(labels.error);
      else setDone(true);
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  if (done) {
    return (
      <div className="card sentcard">
        <p>{labels.done}</p>
        <Link href="/login" className="btn btn-ink btn-sm" style={{ marginTop: 12 }}>
          OK
        </Link>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="err">
        {labels.noSession}{" "}
        <Link href="/forgot-password">↺</Link>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <label htmlFor="newpw">{labels.newPw}</label>
      <input
        id="newpw"
        className="f"
        type="password"
        autoComplete="new-password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder={labels.newPwPh}
      />
      {error && <div className="err">{error}</div>}
      <button className="btn btn-ink" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} disabled={busy}>
        {busy ? labels.saving : labels.save}
      </button>
    </form>
  );
}

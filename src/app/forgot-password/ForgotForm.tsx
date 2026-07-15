"use client";

// Форма запроса сброса пароля. Отправляет письмо со ссылкой на /reset-password.
// Сообщение об успехе одинаковое независимо от того, есть ли аккаунт (не выдаём,
// зарегистрирован email или нет).
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function ForgotForm({
  labels,
}: {
  labels: { emailL: string; send: string; sent: string; error: string; saving: string };
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const redirectTo = new URL("/reset-password", window.location.origin).toString();
      const { error } = await getSupabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) setError(labels.error);
      else setSent(true);
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="card sentcard">
        <div className="icircle">
          <MailCheck size={26} strokeWidth={1.6} />
        </div>
        <p>{labels.sent}</p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <label htmlFor="email">{labels.emailL}</label>
      <input
        id="email"
        className="f"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      {error && <div className="err">{error}</div>}
      <button className="btn btn-ink" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} disabled={busy}>
        {busy ? labels.saving : labels.send}
      </button>
    </form>
  );
}

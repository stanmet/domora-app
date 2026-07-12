"use client";

// Вход по email (magic link). Ссылка ведет на /auth/callback,
// где создается сессия и пользователь в базе.
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Dict } from "@/i18n/dictionaries";

export default function LoginForm({ t, next, initialError }: { t: Dict; next: string | null; initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);
      const { error } = await getSupabaseBrowser().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callback.toString(), shouldCreateUser: false },
      });
      if (error) {
        setError(/signup|not allowed|not found/i.test(error.message) ? t.errNoUser : t.errAuth);
      } else {
        setSent(true);
      }
    } catch {
      setError(t.errAuth);
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
        <h2>{t.linkSentT}</h2>
        <p>
          {t.linkSentP} <b>{email.trim()}</b>. {t.linkSentP2}
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <label htmlFor="email">{t.emailL}</label>
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
      <button className="btn btn-ink" style={{ width: "100%", justifyContent: "center", marginTop: 20 }} disabled={busy}>
        {busy ? t.sending : t.sendLink}
      </button>
      <p className="authnote">
        {t.noAccount} <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>{t.signup}</Link>
      </p>
    </form>
  );
}

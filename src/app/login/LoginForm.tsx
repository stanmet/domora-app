"use client";

// Вход по паролю (основной путь) и по ссылке на почту (запасной путь).
// Пароль: signInWithPassword ставит сессию в cookies, дальше полный переход
// на целевую страницу, где серверные компоненты видят свежую сессию.
// Ссылка на почту: signInWithOtp, письмо ведет на /auth/callback.
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Dict } from "@/i18n/dictionaries";

export default function LoginForm({ t, next, initialError }: { t: Dict; next: string | null; initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Вход по паролю.
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await getSupabaseBrowser().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(t.errCreds);
      } else {
        // Полная перезагрузка: серверные компоненты подхватят cookies сессии,
        // а запись в таблице User создастся на целевой странице (ensureDbUser).
        window.location.assign(next ?? "/account");
      }
    } catch {
      setError(t.errAuth);
    } finally {
      setBusy(false);
    }
  };

  // Запасной путь: одноразовая ссылка на почту.
  const sendLink = async () => {
    if (busy || !email.trim()) {
      setError(t.errCreds);
      return;
    }
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
    <form className="form" onSubmit={submitPassword}>
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
      <label htmlFor="password">{t.passwordL}</label>
      <input
        id="password"
        className="f"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <div className="err">{error}</div>}
      <button className="btn btn-ink" style={{ width: "100%", justifyContent: "center", marginTop: 20 }} disabled={busy}>
        {busy ? t.signingIn : t.login}
      </button>
      <div className="authsep">{t.orSep}</div>
      <button type="button" className="btn btn-line" style={{ width: "100%", justifyContent: "center" }} onClick={sendLink} disabled={busy}>
        {t.linkLogin}
      </button>
      <p className="authnote">
        {t.noAccount} <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>{t.signup}</Link>
      </p>
    </form>
  );
}

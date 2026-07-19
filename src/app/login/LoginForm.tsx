"use client";

// Вход только по email и паролю. signInWithPassword ставит сессию в cookies,
// дальше полный переход на целевую страницу, где серверные компоненты видят
// свежую сессию. Забыли пароль - восстановление по ссылке на почту.
import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import type { Dict } from "@/i18n/dictionaries";

export default function LoginForm({
  t,
  next,
  initialError,
  forgotLabel,
}: {
  t: Dict;
  next: string | null;
  initialError: string | null;
  forgotLabel: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
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
        track("login");
        window.location.assign(next ?? "/account");
      }
    } catch {
      setError(t.errAuth);
    } finally {
      setBusy(false);
    }
  };

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
      <div style={{ textAlign: "right", marginTop: 4 }}>
        <Link href="/forgot-password" style={{ fontSize: 13 }}>
          {forgotLabel}
        </Link>
      </div>
      {error && <div className="err">{error}</div>}
      <button className="btn btn-ink" style={{ width: "100%", justifyContent: "center", marginTop: 20 }} disabled={busy}>
        {busy ? t.signingIn : t.login}
      </button>
      <p className="authnote">
        {t.noAccount} <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>{t.signup}</Link>
      </p>
    </form>
  );
}

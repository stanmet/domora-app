"use client";

// Быстрый вход через Google и Apple (Supabase OAuth). Провайдеры включаются в
// панели Supabase; если провайдер выключен, Supabase вернёт ошибку и мы её покажем.
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function OAuthButtons({
  next,
  labels,
}: {
  next: string | null;
  labels: { google: string; apple: string; error: string; sep: string };
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (provider: "google" | "apple") => {
    if (busy) return;
    setBusy(provider);
    setError(null);
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);
      const { error } = await getSupabaseBrowser().auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback.toString() },
      });
      if (error) {
        setError(labels.error);
        setBusy(null);
      }
      // При успехе браузер уходит на провайдера (редирект), состояние не важно.
    } catch {
      setError(labels.error);
      setBusy(null);
    }
  };

  return (
    <div className="oauth">
      <button type="button" className="btn btn-line oauth-btn" onClick={() => signIn("google")} disabled={!!busy}>
        <GoogleIcon /> {labels.google}
      </button>
      <button type="button" className="btn btn-line oauth-btn" onClick={() => signIn("apple")} disabled={!!busy}>
        <AppleIcon /> {labels.apple}
      </button>
      {error && <div className="err" style={{ marginTop: 4 }}>{error}</div>}
      <div className="authsep">{labels.sep}</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.4l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.13-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13zM14.53 3.9c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-3 1.54-.66.76-1.24 1.98-1.08 3.15 1.14.09 2.31-.58 3.02-1.44z" />
    </svg>
  );
}

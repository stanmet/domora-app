"use client";

// Регистрация: имя, email и роль (заказчик или исполнитель).
// Имя и роль уезжают в user_metadata и применяются в /auth/callback
// при создании записи в таблице User.
import { useState } from "react";
import Link from "next/link";
import { Briefcase, MailCheck, UserRound } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Dict } from "@/i18n/dictionaries";

type RoleChoice = "client" | "provider";

export default function SignupForm({ t, next, initialRole }: { t: Dict; next: string | null; initialRole: RoleChoice }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleChoice>(initialRole);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !name.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", next ?? (role === "provider" ? "/pro" : "/account"));
      const { error } = await getSupabaseBrowser().auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callback.toString(),
          shouldCreateUser: true,
          data: { name: name.trim(), role },
        },
      });
      if (error) setError(t.errAuth);
      else setSent(true);
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

  const roles: { key: RoleChoice; icon: typeof UserRound; title: string; text: string }[] = [
    { key: "client", icon: UserRound, title: t.roleClient, text: t.roleClientP },
    { key: "provider", icon: Briefcase, title: t.rolePro, text: t.roleProP },
  ];

  return (
    <form className="form" onSubmit={submit}>
      <label>{t.roleL}</label>
      <div className="rolecards">
        {roles.map((r) => (
          <button
            key={r.key}
            type="button"
            className={"rolecard" + (role === r.key ? " on" : "")}
            onClick={() => setRole(r.key)}
            aria-pressed={role === r.key}
          >
            <span className="icircle">
              <r.icon size={20} strokeWidth={1.7} />
            </span>
            <span>
              <h4>{r.title}</h4>
              <p>{r.text}</p>
            </span>
          </button>
        ))}
      </div>
      <label htmlFor="name">{t.nameL}</label>
      <input id="name" className="f" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
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
      <button className="btn btn-green" style={{ width: "100%", justifyContent: "center", marginTop: 20 }} disabled={busy}>
        {busy ? t.sending : t.sendLink}
      </button>
      <p className="authnote">
        {t.haveAccount} <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>{t.login}</Link>
      </p>
    </form>
  );
}

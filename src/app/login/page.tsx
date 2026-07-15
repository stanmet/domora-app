// Страница входа: email и пароль (основной путь), ссылка на почту как запасной.
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

type SearchParams = { next?: string; error?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { next = "", error = "" } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;

  return (
    <main>
      <div className="wrap auth">
        <h1 className="page">{t.loginTitle}</h1>
        <p className="sub">{t.loginSub}</p>
        <LoginForm t={t} next={safeNext} initialError={error ? t.errAuth : null} forgotLabel={tx.pwForgotLink} />
      </div>
    </main>
  );
}

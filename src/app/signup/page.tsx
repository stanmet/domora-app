// Страница регистрации: выбор роли (заказчик или исполнитель), имя, email, пароль.
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

type SearchParams = { role?: string; next?: string };

export default async function SignupPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { role = "", next = "" } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;
  const initialRole = role === "pro" || role === "provider" ? "provider" : "client";

  return (
    <main>
      <div className="wrap auth">
        <h1 className="page">{t.signupTitle}</h1>
        <p className="sub">{t.signupSub}</p>
        <SignupForm t={t} next={safeNext} initialRole={initialRole} resendLabel={tx.resendEmail} resendDoneLabel={tx.resendEmailDone} />
      </div>
    </main>
  );
}

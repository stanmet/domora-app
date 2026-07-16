// Страница «Забыли пароль»: запрос ссылки для сброса пароля.
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import ForgotForm from "./ForgotForm";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);

  return (
    <main>
      <div className="wrap auth">
        <h1 className="page">{tx.pwForgotTitle}</h1>
        <p className="sub">{tx.pwForgotSub}</p>
        <ForgotForm
          labels={{
            emailL: t.emailL,
            send: tx.pwForgotSend,
            sent: tx.pwForgotSent,
            error: tx.genericError,
            saving: tx.saving,
          }}
        />
      </div>
    </main>
  );
}

// Страница установки нового пароля по ссылке из письма.
import { getLocale } from "@/i18n/server";
import { getExtra } from "@/i18n/extra";
import ResetForm from "./ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const locale = await getLocale();
  const tx = getExtra(locale);

  return (
    <main>
      <div className="wrap auth">
        <h1 className="page">{tx.pwResetTitle}</h1>
        <p className="sub">{tx.pwResetSub}</p>
        <ResetForm
          labels={{
            newPw: tx.accNewPw,
            newPwPh: tx.accNewPwPh,
            save: tx.pwResetSave,
            done: tx.pwResetDone,
            weak: tx.accPwWeak,
            noSession: tx.pwResetNoSession,
            error: tx.genericError,
            saving: tx.saving,
          }}
        />
      </div>
    </main>
  );
}

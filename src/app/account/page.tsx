// Личный кабинет: данные пользователя из таблицы User, роль и выход.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Role } from "@prisma/client";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/account");

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  const isPro = user.roles.includes(Role.PROVIDER);

  return (
    <main>
      <div className="wrap auth">
        <h1 className="page">{t.accountTitle}</h1>
        <p className="sub">{t.accountSub}</p>
        <div className="form">
          <label>{t.nameL}</label>
          <div className="acc-val">{user.name}</div>
          <label>{t.emailL}</label>
          <div className="acc-val">{user.email}</div>
          <label>{t.roleTitle}</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="tag">{t.roleClient}</span>
            {isPro && <span className="tag">{t.rolePro}</span>}
          </div>
        </div>
        <div className="acc-actions">
          <Link href="/bookings" className="btn btn-line">
            {t.myBookings}
          </Link>
          {isPro ? (
            <Link href="/pro" className="btn btn-green">
              {t.openPro} <ArrowRight size={15} />
            </Link>
          ) : (
            <Link href="/signup?role=pro" className="btn btn-ghost">
              {t.becomePro}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

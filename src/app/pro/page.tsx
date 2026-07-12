// Кабинет исполнителя: доступен только пользователям с ролью PROVIDER.
// Дизайн из prototypes/HostDashboard.jsx (обзор с онбординг-чеклистом).
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import ProOnboarding from "./ProOnboarding";

export const dynamic = "force-dynamic";

export default async function ProPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro");

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 680, paddingBottom: 64 }}>
        <h1 className="page">{t.proDash}</h1>
        <p className="sub">{t.proWelcome}</p>
        <ProOnboarding t={t} />
      </div>
    </main>
  );
}

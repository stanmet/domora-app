// Кабинет исполнителя: доступен только пользователям с ролью PROVIDER.
// Дизайн из prototypes/HostDashboard.jsx (обзор с онбординг-чеклистом).
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { BookingStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { expireOverdueRequests } from "@/lib/bookings";
import ProOnboarding from "./ProOnboarding";

export const dynamic = "force-dynamic";

export default async function ProPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro");

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");

  await expireOverdueRequests({ providerId: user.id });
  const newRequests = await prisma.booking.count({
    where: { providerId: user.id, status: BookingStatus.REQUESTED },
  });

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 680, paddingBottom: 64 }}>
        <h1 className="page">{t.proDash}</h1>
        <p className="sub">{t.proWelcome}</p>
        <div className="card">
          <div className="ob-head" style={{ marginBottom: 0, alignItems: "center" }}>
            <div className="icircle">
              <ClipboardCheck size={22} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>{t.ordersT}</h3>
              <p>
                {t.newReq}: {newRequests}
              </p>
            </div>
            <Link href="/pro/bookings" className="btn btn-ink btn-sm">
              {t.obGo} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
        <ProOnboarding t={t} />
      </div>
    </main>
  );
}

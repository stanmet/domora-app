// Кабинет исполнителя: доступен только пользователям с ролью PROVIDER.
// Дизайн из prototypes/HostDashboard.jsx (обзор с онбординг-чеклистом).
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, ClipboardCheck, ClipboardList, Gauge, Images, LayoutGrid, UserRound } from "lucide-react";
import { BookingStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { expireOverdueRequests } from "@/lib/bookings";
import { providerHealth } from "@/lib/health";
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
  // Заказы "в работе": исполнитель выбран, но заказ ещё не завершён.
  const newRequests = await prisma.booking.count({
    where: { providerId: user.id, status: BookingStatus.IN_PROGRESS },
  });

  const listingsCount = await prisma.listing.count({ where: { providerId: user.id } });
  const health = await providerHealth(user.id);
  const pctText = (v: number | null) => (v === null ? "—" : Math.round(v * 100) + "%");

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
        <div className="card">
          <div className="ob-head" style={{ marginBottom: 0, alignItems: "center" }}>
            <div className="icircle">
              <LayoutGrid size={22} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>{t.myServices}</h3>
              <p>
                {t.svcCountL}: {listingsCount}
              </p>
            </div>
            <Link href="/pro/services" className="btn btn-ink btn-sm">
              {t.obGo} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
        <div className="card">
          <div className="ob-head" style={{ marginBottom: 0, alignItems: "center" }}>
            <div className="icircle">
              <UserRound size={22} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>{t.proProfile}</h3>
              <p>{t.proProfileSub}</p>
            </div>
            <Link href="/pro/profile" className="btn btn-ink btn-sm">
              {t.obGo} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
        <div className="card">
          <div className="ob-head" style={{ marginBottom: 0, alignItems: "center" }}>
            <div className="icircle">
              <CalendarClock size={22} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>{t.avTitle}</h3>
              <p>{t.avSub}</p>
            </div>
            <Link href="/pro/availability" className="btn btn-ink btn-sm">
              {t.obGo} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
        <div className="card">
          <div className="ob-head" style={{ marginBottom: 0, alignItems: "center" }}>
            <div className="icircle">
              <ClipboardList size={22} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>{t.taskBoard}</h3>
              <p>{t.tasksFeedSub}</p>
            </div>
            <Link href="/tasks" className="btn btn-ink btn-sm">
              {t.obGo} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
        <div className="card">
          <div className="ob-head" style={{ marginBottom: 0, alignItems: "center" }}>
            <div className="icircle">
              <Images size={22} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>{t.portfolioTitle}</h3>
              <p>{t.portfolioSub}</p>
            </div>
            <Link href="/pro/portfolio" className="btn btn-ink btn-sm">
              {t.obGo} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
        {health.handled > 0 && (
          <div className="card">
            <div className="ob-head" style={{ marginBottom: 12, alignItems: "center" }}>
              <div className="icircle" style={{ background: health.healthy ? "var(--sage)" : "#FDEBE0", color: health.healthy ? "var(--green)" : "var(--orange)" }}>
                <Gauge size={22} strokeWidth={1.7} />
              </div>
              <div style={{ flex: 1 }}>
                <h3>{t.healthTitle}</h3>
              </div>
            </div>
            <div className="health-row">
              <div className="health-metric">
                <b>{pctText(health.acceptanceRate)}</b>
                <span>{t.healthAcceptance}</span>
              </div>
              <div className="health-metric">
                <b>{pctText(health.cancellationRate)}</b>
                <span>{t.healthCancellation}</span>
              </div>
            </div>
            {!health.healthy && <p className="health-warn">{t.healthWarn}</p>}
          </div>
        )}

        <ProOnboarding t={t} listingDone={listingsCount > 0} />
      </div>
    </main>
  );
}

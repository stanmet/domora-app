// Кабинет исполнителя: доступен только пользователям с ролью PROVIDER.
// Дизайн из prototypes/HostDashboard.jsx (обзор с онбординг-чеклистом).
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, ClipboardCheck, ClipboardList, FileCheck2, Gauge, Images, Landmark, LayoutGrid, UserRound } from "lucide-react";
import { BookingStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { expireOverdueRequests } from "@/lib/bookings";
import { stripe } from "@/lib/stripe";
import { providerHealth } from "@/lib/health";
import ProOnboarding from "./ProOnboarding";

export const dynamic = "force-dynamic";

export default async function ProPage({ searchParams }: { searchParams: Promise<{ onboarded?: string }> }) {
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

  const { onboarded } = await searchParams;
  let profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { stripeAccountId: true, payoutsEnabled: true },
  });

  // Возврат из онбординга Stripe: сверяем статус аккаунта сразу, не дожидаясь
  // вебхука account.updated (он остается источником правды и придет тоже).
  if (onboarded === "1" && profile?.stripeAccountId && !profile.payoutsEnabled) {
    const account = await stripe.accounts.retrieve(profile.stripeAccountId).catch(() => null);
    if (account?.payouts_enabled) {
      profile = await prisma.providerProfile.update({
        where: { userId: user.id },
        data: { payoutsEnabled: true },
        select: { stripeAccountId: true, payoutsEnabled: true },
      });
    }
  }

  const listingsCount = await prisma.listing.count({ where: { providerId: user.id } });
  const health = await providerHealth(user.id);
  const pctText = (v: number | null) => (v === null ? "—" : Math.round(v * 100) + "%");

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 680, paddingBottom: 64 }}>
        <h1 className="page">{t.proDash}</h1>
        <p className="sub">{t.proWelcome}</p>

        {/* Налоговая напоминалка (Ирландия): порог €5000/год */}
        <Link href="/taxes" className="tip" style={{ margin: "0 0 14px", textDecoration: "none" }}>
          <div className="ti" style={{ background: "var(--green)" }}>
            <Landmark size={20} />
          </div>
          <p>
            {t.taxReminder} <b style={{ color: "var(--green-dark)" }}>{t.learnMore} →</b>
          </p>
        </Link>
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
        <div className="card">
          <div className="ob-head" style={{ marginBottom: 0, alignItems: "center" }}>
            <div className="icircle">
              <FileCheck2 size={22} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>{t.docsTitle}</h3>
              <p>{t.docsSub}</p>
            </div>
            <Link href="/pro/documents" className="btn btn-ink btn-sm">
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

        <ProOnboarding t={t} stripeDone={!!profile?.payoutsEnabled} listingDone={listingsCount > 0} />
      </div>
    </main>
  );
}

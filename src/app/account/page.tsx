// Личный кабинет: данные пользователя из таблицы User, роль и выход.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, Ticket, X } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict, unitLabel } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { eur } from "@/lib/format";
import { cancelSubscription } from "@/app/subscriptions/actions";
import { updateProfile, deleteAccount } from "./actions";
import AccountForm from "./AccountForm";
import ConfirmAction from "@/components/ConfirmAction";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; err?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/account");

  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const user = await ensureDbUser(authUser, locale);
  const { saved, err } = await searchParams;
  const isPro = user.roles.includes(Role.PROVIDER);
  const isAdmin = user.roles.includes(Role.ADMIN);

  // Подписки клиента на регулярные визиты (частота из rrule).
  const freqLabel = (rrule: string) =>
    rrule.includes("MONTHLY") ? t.subFreqMonthly : rrule.includes("INTERVAL=2") ? t.subFreqBiweekly : t.subFreqWeekly;
  let subs: { id: string; rrule: string; listing: { title: string; providerId: string; priceCents: number; unit: string } | null }[] = [];
  try {
    const rows = await prisma.subscription.findMany({
      where: { clientId: user.id, status: "active" },
      orderBy: { createdAt: "desc" },
      select: { id: true, rrule: true, listingId: true },
    });
    if (rows.length) {
      const listings = await prisma.listing.findMany({
        where: { id: { in: rows.map((r) => r.listingId) } },
        select: { id: true, title: true, providerId: true, priceCents: true, unit: true },
      });
      const byId = new Map(listings.map((l) => [l.id, l]));
      subs = rows.map((r) => ({ id: r.id, rrule: r.rrule, listing: byId.get(r.listingId) ?? null }));
    }
  } catch {
    // Таблица подписок недоступна.
  }

  // Активные купоны клиента.
  let coupons: { id: string; code: string; pct: number }[] = [];
  try {
    coupons = await prisma.coupon.findMany({
      where: { clientId: user.id, status: "active", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true, pct: true },
    });
  } catch {
    // Таблица купонов недоступна.
  }

  return (
    <main>
      <div className="wrap auth">
        <h1 className="page">{t.accountTitle}</h1>
        <p className="sub">{t.accountSub}</p>

        {err === "active" && <div className="err" style={{ marginBottom: 12 }}>{tx.accDeleteActive}</div>}

        <div className="form" style={{ marginBottom: 8 }}>
          <label>{t.emailL}</label>
          <div className="acc-val">{user.email}</div>
          <label>{t.roleTitle}</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="tag">{t.roleClient}</span>
            {isPro && <span className="tag">{t.rolePro}</span>}
          </div>
        </div>

        <AccountForm
          action={updateProfile}
          current={{ name: user.name, phone: user.phone ?? "", locale }}
          labels={{ ...tx, nameL: t.nameL }}
          savedFlag={saved === "1"}
        />
        <div className="acc-actions">
          <Link href="/bookings" className="btn btn-line">
            {t.myBookings}
          </Link>
          <Link href="/tasks/mine" className="btn btn-line">
            {t.myTasks}
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
          {isAdmin && (
            <Link href="/admin" className="btn btn-ink">
              {t.adminPanel} <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {coupons.length > 0 && (
          <section className="subs-sec">
            <h2 className="subs-title">
              <Ticket size={18} /> {t.myCoupons}
            </h2>
            <div className="subs-list">
              {coupons.map((c) => (
                <div className="subs-row" key={c.id}>
                  <div className="subs-info">
                    <span className="subs-name">{c.code}</span>
                    <div className="subs-meta">
                      -{c.pct}% {t.couponOff}
                    </div>
                  </div>
                  <span className="coupon-badge">-{c.pct}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="subs-sec">
          <h2 className="subs-title">
            <CalendarClock size={18} /> {t.mySubs}
          </h2>
          {subs.length === 0 ? (
            <div className="empty">{t.subEmpty}</div>
          ) : (
            <div className="subs-list">
              {subs.map((s) => (
                <div className="subs-row" key={s.id}>
                  <div className="subs-info">
                    <Link href={s.listing ? `/providers/${s.listing.providerId}` : "#"} className="subs-name">
                      {s.listing?.title ?? "—"}
                    </Link>
                    <div className="subs-meta">
                      {freqLabel(s.rrule)}
                      {s.listing && (
                        <>
                          {" · "}
                          {eur(Math.round(s.listing.priceCents * 0.9), locale)} / {unitLabel(t, s.listing.unit)}
                        </>
                      )}
                    </div>
                  </div>
                  <form action={cancelSubscription.bind(null, s.id)}>
                    <button className="btn btn-line btn-sm">
                      <X size={14} /> {t.subCancel}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="subs-sec">
          <h2 className="subs-title">{tx.accDangerZone}</h2>
          <p className="sub" style={{ marginTop: 0 }}>{tx.accDangerText}</p>
          <ConfirmAction
            action={deleteAccount}
            label={tx.accDeleteBtn}
            warning={tx.accDangerText}
            confirmLabel={tx.accDeleteConfirm}
            backLabel={tx.accDeleteBack}
          />
        </section>
      </div>
    </main>
  );
}

// Личный кабинет: данные пользователя из таблицы User, роль и выход.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, X } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict, unitLabel } from "@/i18n/dictionaries";
import { eur } from "@/lib/format";
import { cancelSubscription } from "@/app/subscriptions/actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/account");

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
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
      </div>
    </main>
  );
}

// Календарь доступности исполнителя: рабочие дни и часы + список заблокированных
// дат (выходной/отпуск). Влияет на то, какие слоты может выбрать клиент.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { minToHHMM, dayKeyUTC } from "@/lib/availability";
import { saveSchedule, addTimeOff, removeTimeOff } from "./actions";

export const dynamic = "force-dynamic";

// Локализованные короткие названия дней недели (0=вс..6=сб) без словаря.
function weekdayNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  // 2026-07-19 (UTC) - воскресенье.
  return [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = new Date(Date.UTC(2026, 6, 19 + i));
    const s = fmt.format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
}

export default async function ProAvailabilityPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/availability");

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { workDays: true, workStartMin: true, workEndMin: true },
  });
  const workDays = profile?.workDays ?? [1, 2, 3, 4, 5];
  const start = minToHHMM(profile?.workStartMin ?? 540);
  const end = minToHHMM(profile?.workEndMin ?? 1200);

  const todayKey = dayKeyUTC(new Date());
  const timeOff = await prisma.timeOff.findMany({
    where: { providerId: user.id, date: { gte: new Date(`${todayKey}T00:00:00.000Z`) } },
    orderBy: { date: "asc" },
    select: { id: true, date: true },
  });

  const names = weekdayNames(locale);
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "short", timeZone: "UTC" });

  return (
    <main className="wrap sec" style={{ maxWidth: 620 }}>
      <Link href="/pro" className="backlink">
        <ArrowLeft size={16} /> {t.proDash}
      </Link>
      <h1 className="page">{t.avTitle}</h1>
      <p className="sub">{t.avSub}</p>

      {/* Рабочие дни и часы */}
      <form action={saveSchedule} className="pp-form">
        <div className="f-row">
          <span>{t.avWorkDays}</span>
          <div className="av-days">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <label key={d} className={"av-day" + (workDays.includes(d) ? " on" : "")}>
                <input type="checkbox" name={`d${d}`} defaultChecked={workDays.includes(d)} />
                <span>{names[d]}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="av-hours">
          <label className="f-row">
            <span>{t.avHoursFrom}</span>
            <input type="time" name="start" defaultValue={start} step={1800} />
          </label>
          <label className="f-row">
            <span>{t.avHoursTo}</span>
            <input type="time" name="end" defaultValue={end} step={1800} />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-green">{t.avSave}</button>
        </div>
      </form>

      {/* Заблокированные даты */}
      <h3 className="tu-h">{t.avTimeOff}</h3>
      <p className="tu-muted" style={{ marginBottom: 10 }}>{t.avTimeOffSub}</p>
      <form action={addTimeOff} className="av-addoff">
        <input type="date" name="date" required min={todayKey} />
        <button className="btn btn-ink btn-sm">{t.avAdd}</button>
      </form>
      {timeOff.length === 0 ? (
        <div className="empty" style={{ marginTop: 12 }}>{t.avNoBlocks}</div>
      ) : (
        <ul className="av-list">
          {timeOff.map((o) => (
            <li key={o.id}>
              <span>{dateFmt.format(o.date)}</span>
              <form action={removeTimeOff}>
                <input type="hidden" name="id" value={o.id} />
                <button className="btn btn-red btn-sm" aria-label="remove">
                  <Trash2 size={14} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

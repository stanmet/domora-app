// Лента задач для исполнителей: задачи их категорий и города со статусом OPEN.
// Фильтры по категории и городу. Кнопка "Откликнуться" открывает форму отклика.
// Точный адрес клиента не показывается до подтверждения брони.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, MapPin, Tag, Users, Wallet } from "lucide-react";
import { Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict, type Dict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { CATEGORY_ICONS, sortByCategoryOrder } from "@/components/categories";
import { dateTime, eur } from "@/lib/format";
import { expireOverdueTasks, openTaskVisibilityWhere, providerActiveCategoryIds, MAX_OFFERS_PER_TASK } from "@/lib/tasks";
import { reachable } from "@/lib/ireland";
import OfferForm from "./OfferForm";

export const dynamic = "force-dynamic";

type SearchParams = { cat?: string; all?: string };

function budgetText(t: Dict, locale: Locale, from: number | null, to: number | null): string | null {
  if (from != null && to != null) return `${t.fromCap} ${eur(from, locale)} · ${t.budgetToL} ${eur(to, locale)}`;
  if (from != null) return `${t.fromCap} ${eur(from, locale)}`;
  if (to != null) return `${t.budgetToL} ${eur(to, locale)}`;
  return null;
}

export default async function TasksFeedPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks");

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  const { cat = "", all = "" } = await searchParams;

  // Доска задач доступна только исполнителям с активной услугой.
  const notAvailable = (
    <main className="wrap sec">
      <h1 className="page">{t.tasksFeedTitle}</h1>
      <div className="empty">
        {t.tasksProvidersOnly}
        <div style={{ marginTop: 16 }}>
          <Link href={user.roles.includes(Role.PROVIDER) ? "/pro/services" : "/signup?role=pro"} className="btn btn-ink btn-sm">
            {user.roles.includes(Role.PROVIDER) ? t.addListing : t.becomePro}
          </Link>
        </div>
      </div>
    </main>
  );

  if (!user.roles.includes(Role.PROVIDER)) return notAvailable;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { city: true, travelRadiusKm: true },
  });
  const activeCategoryIds = await providerActiveCategoryIds(user.id);
  if (!profile || activeCategoryIds.length === 0) return notAvailable;

  // Категории исполнителя для фильтра.
  const categoryRows = sortByCategoryOrder(
    await prisma.category.findMany({ where: { id: { in: activeCategoryIds } } }),
  );
  const catBySlug = new Map(categoryRows.map((c) => [c.slug, c]));
  const activeCat = cat && catBySlug.has(cat) ? catBySlug.get(cat)! : null;
  const showAllCities = all === "1";

  await expireOverdueTasks({ categoryId: { in: activeCategoryIds } });

  // Город в SQL не фильтруем: ниже отбираем задачи по радиусу выезда исполнителя
  // из его города (кнопка «все города» показывает задачи по всей стране).
  const where: Prisma.TaskWhereInput = {
    ...openTaskVisibilityWhere(),
    clientId: { not: user.id },
    categoryId: activeCat ? activeCat.id : { in: activeCategoryIds },
  };

  const tasksRaw = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { slug: true, nameEn: true, nameRu: true } },
      offers: { select: { providerId: true } },
    },
  });
  const tasks = showAllCities
    ? tasksRaw
    : tasksRaw.filter((task) => reachable(profile.city, profile.travelRadiusKm, task.city));

  return (
    <main className="wrap sec">
      <h1 className="page">{t.tasksFeedTitle}</h1>
      <p className="sub">{t.tasksFeedSub}</p>

      <div className="chips" style={{ marginBottom: 12 }}>
        <Link href={buildHref("", showAllCities)} className={"chip" + (activeCat ? "" : " on")}>
          {t.all}
        </Link>
        {categoryRows.map((c) => (
          <Link key={c.slug} href={buildHref(c.slug, showAllCities)} className={"chip" + (activeCat?.slug === c.slug ? " on" : "")}>
            {categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn)}
          </Link>
        ))}
      </div>
      <div className="chips">
        <Link href={buildHref(cat, false)} className={"chip" + (showAllCities ? "" : " on")}>
          <MapPin size={13} /> {profile.city}
        </Link>
        <Link href={buildHref(cat, true)} className={"chip" + (showAllCities ? " on" : "")}>
          {t.cityAll}
        </Link>
      </div>

      <div className="count">
        {tasks.length} {t.results}
      </div>

      {tasks.length === 0 ? (
        <div className="empty">{t.tasksEmpty}</div>
      ) : (
        <div className="tasklist">
          {tasks.map((task) => {
            const Icon = CATEGORY_ICONS[task.category.slug] ?? CATEGORY_ICONS.other;
            const offerCount = task.offers.length;
            const alreadyOffered = task.offers.some((o) => o.providerId === user.id);
            const full = offerCount >= MAX_OFFERS_PER_TASK;
            const budget = budgetText(t, locale, task.budgetFromCents, task.budgetToCents);
            return (
              <div className="taskcard" key={task.id}>
                <div className="taskhead">
                  <span className="tasktag">
                    <Icon size={13} /> {categoryLabel(t, task.category.slug, locale === "ru" ? task.category.nameRu : task.category.nameEn)}
                  </span>
                  <span className="taskoffers">
                    <Users size={13} /> {t.offerCountL}: {offerCount}
                  </span>
                </div>
                <Link href={`/tasks/${task.id}`}>
                  <h3>{task.title}</h3>
                </Link>
                {task.description && task.description !== task.title && <p className="taskdesc">{task.description}</p>}
                <div className="meta">
                  {task.dateWanted && (
                    <span>
                      <Calendar size={13} /> {dateTime(task.dateWanted, locale)}
                    </span>
                  )}
                  <span>
                    <MapPin size={13} /> {task.city}
                  </span>
                  {budget && (
                    <span>
                      <Wallet size={13} /> {budget}
                    </span>
                  )}
                </div>
                <div className="taskaction">
                  {alreadyOffered ? (
                    <div className="offer-sent">
                      <Tag size={15} /> {t.offerSent}
                    </div>
                  ) : full ? (
                    <div className="empty" style={{ padding: "8px 0", textAlign: "left" }}>
                      {t.offerMax}
                    </div>
                  ) : (
                    <OfferForm taskId={task.id} t={t} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );

  function buildHref(catSlug: string, allCities: boolean): string {
    const params = new URLSearchParams();
    if (catSlug) params.set("cat", catSlug);
    if (allCities) params.set("all", "1");
    const s = params.toString();
    return s ? `/tasks?${s}` : "/tasks";
  }
}

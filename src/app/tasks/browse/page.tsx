// Публичная лента открытых задач: все свежие задачи заказчиков, видны всем
// (включая гостей). Открывается по ссылке "Смотреть" из блока на главной,
// аналогично каталогу исполнителей. Карточка ведёт на страницу задачи.
// Фильтры по категории и городу (состояние в URL: ?cat= и ?city=).
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { langName } from "@/i18n/config";
import { CATEGORY_ICONS, sortByCategoryOrder } from "@/components/categories";
import { budgetText, dateOnly } from "@/lib/format";
import { openTaskVisibilityWhere } from "@/lib/tasks";
import { getCachedCategories } from "@/lib/categories-cache";
import { isDemoMode } from "@/lib/test-users/bots";
import { IRELAND_TOWN_NAMES } from "@/lib/ireland";
import { translateBatch } from "@/lib/translate";
import TranslatableText, { type TrLabels } from "@/components/TranslatableText";
import TaskFilters from "./TaskFilters";

export const dynamic = "force-dynamic";

type SearchParams = { cat?: string; city?: string };

export default async function OpenTasksBrowsePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { cat = "", city = "" } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);
  const trLabels: TrLabels = { from: t.translatedFrom, showOriginal: t.showOriginal, showTranslation: t.showTranslation };

  // Демо-режим: показываем тестовые (ботовские) задачи только когда он включён.
  const demo = await isDemoMode();

  // Категории для фильтра и активная (выбранная) категория. База может быть
  // временно недоступна сразу после деплоя - тогда показываем пустую ленту,
  // не роняя страницу.
  const [categories, openTasks] = await Promise.all([
    getCachedCategories().catch(() => [] as Awaited<ReturnType<typeof getCachedCategories>>),
    prisma.task
      .findMany({
        where: {
          ...openTaskVisibilityWhere(demo),
          ...(city ? { city } : {}),
          ...(cat ? { category: { slug: cat } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 120,
        include: {
          category: { select: { slug: true, nameEn: true, nameRu: true } },
          _count: { select: { offers: true } },
        },
      })
      .catch(() => []),
  ]);

  const cats = sortByCategoryOrder(categories);
  const activeCat = cat && cats.some((c) => c.slug === cat) ? cat : "";
  const catOptions = cats.map((c) => ({ slug: c.slug, label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn) }));

  // Автоперевод заголовков задач на язык интерфейса.
  const tr = await translateBatch(openTasks.map((x) => x.title), locale);
  const trOf = (s: string) => tr.get(s.trim()) ?? { text: s, sourceLang: locale, translated: false };

  return (
    <main className="wrap sec">
      <Link href="/" className="back">
        <ArrowLeft size={14} /> {t.navHome}
      </Link>
      <h1 className="page">{t.openTasksTitle}</h1>
      <p className="sub">{t.openTasksSub}</p>

      <TaskFilters
        cat={activeCat}
        city={city}
        categories={catOptions}
        cities={IRELAND_TOWN_NAMES}
        labels={{ catL: t.liCat, catAll: t.catAll, cityL: t.taskCityL, cityAll: t.cityAll }}
      />

      <div className="count">
        {openTasks.length} {t.results}
      </div>

      {openTasks.length === 0 ? (
        <div className="empty">{t.openTasksEmpty}</div>
      ) : (
        <div className="taskgrid">
          {openTasks.map((task) => {
            const Icon = CATEGORY_ICONS[task.category.slug] ?? CATEGORY_ICONS.other;
            const budget = budgetText(task.budgetFromCents, task.budgetToCents, locale, { from: t.fromCap, to: t.budgetToL });
            const tt = trOf(task.title);
            return (
              <Link href={`/tasks/${task.id}`} className="taskcard" key={task.id}>
                <div className="taskhead">
                  <span className="tasktag">
                    <Icon size={13} /> {categoryLabel(t, task.category.slug, locale === "ru" ? task.category.nameRu : task.category.nameEn)}
                  </span>
                  <span className="taskoffers">
                    <Users size={13} /> {task._count.offers}
                  </span>
                </div>
                <TranslatableText
                  as="h3"
                  display={tt.text}
                  original={task.title}
                  translated={tt.translated}
                  sourceLangName={langName(tt.sourceLang)}
                  labels={trLabels}
                />
                <div className="meta">
                  {task.dateWanted && (
                    <span>
                      <Calendar size={13} /> {dateOnly(task.dateWanted, locale)}
                    </span>
                  )}
                  <span>
                    <MapPin size={13} /> {task.city}
                  </span>
                  {budget && (
                    <span className="budget">
                      <Wallet size={13} /> {budget}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

// Раздел админки «Тестовые пользователи». Чистый, понятный интерфейс: сверху -
// главное (статистика, показ на сайте, создание, фото, список с удалением),
// а автоматизация и настройки AI спрятаны в сворачиваемый блок «Дополнительно».
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sortByCategoryOrder } from "@/components/categories";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { listTestUsers, recentAudit, testStats, TEST_CITIES, type CreateRole } from "@/lib/test-users";
import { getBotConfig, recentBotActivity } from "@/lib/test-users/bots";
import { getAiUsage } from "@/lib/test-users/ai-usage";
import ConfirmButton from "../ConfirmButton";
import CreateForm from "./CreateForm";
import {
  deleteAllTestUsersAction,
  deleteOneTestUserAction,
  deleteSelectedTestUsersAction,
  fillTestUsersMediaAction,
  runBotTickAction,
  saveBotConfigAction,
  setDemoModeAction,
  toggleAllBotsAction,
} from "./actions";

export type TestFilter = { role?: CreateRole; categorySlug?: string };

function tr(locale: Locale) {
  const ru = locale === "ru";
  return {
    intro: ru
      ? "Демонстрационные аккаунты, чтобы витрина выглядела живой. Скрыты от поиска, рейтингов и статистики. К оплатам доступа нет."
      : "Demo accounts to make the storefront look alive. Hidden from search, ratings and stats. No access to payments.",
    statTotal: ru ? "Всего" : "Total",
    statProviders: ru ? "Исполнители" : "Providers",
    statClients: ru ? "Клиенты" : "Clients",
    statListings: ru ? "Услуги" : "Listings",
    statTasks: ru ? "Задачи" : "Tasks",
    byCategory: ru ? "По категориям" : "By category",

    demoOn: ru ? "Боты показываются на сайте" : "Bots are shown on the site",
    demoOff: ru ? "Боты скрыты с сайта" : "Bots are hidden from the site",
    demoHint: ru
      ? "Показывает демо-ботов на главной, в каталоге и ленте задач. Выключите перед приходом реальных клиентов."
      : "Shows demo bots on the home page, catalogue and task feed. Turn off before real clients arrive.",
    showOnSite: ru ? "Показать на сайте" : "Show on site",
    hideFromSite: ru ? "Скрыть с сайта" : "Hide from site",

    createTitle: ru ? "Создать ботов" : "Create bots",
    fillMedia: ru ? "Заполнить фото и описания" : "Fill photos and descriptions",
    fillMediaHint: ru
      ? "Проставляет всем ботам портреты, тематические фото услуг и тексты. Можно жать повторно."
      : "Sets portraits, on-topic service photos and texts for all bots. Safe to run again.",

    listTitle: ru ? "Список ботов" : "Bots",
    filterAll: ru ? "Все" : "All",
    roleProviders: ru ? "Исполнители" : "Providers",
    roleClients: ru ? "Клиенты" : "Clients",
    colName: ru ? "Имя" : "Name",
    colRole: ru ? "Роль" : "Role",
    colCity: ru ? "Город" : "City",
    colCategory: ru ? "Категория" : "Category",
    provider: ru ? "исполнитель" : "provider",
    client: ru ? "клиент" : "client",
    deleteSelected: ru ? "Удалить выбранные" : "Delete selected",
    deleteOne: ru ? "Удалить" : "Delete",
    deleteAll: ru ? "Удалить всех" : "Delete all",
    empty: ru ? "Ботов пока нет. Создайте партию выше." : "No bots yet. Create a batch above.",
    confirmDeleteAll: ru ? "Удалить ВСЕХ ботов? Это необратимо." : "Delete ALL bots? This cannot be undone.",
    confirmDeleteSel: ru ? "Удалить выбранных ботов?" : "Delete selected bots?",
    confirmDeleteOne: ru ? "Удалить этого бота?" : "Delete this bot?",

    auditTitle: ru ? "Последние действия" : "Recent actions",
    auditEmpty: ru ? "Пока пусто." : "Nothing yet.",

    advanced: ru ? "Дополнительно: автосценарии и AI" : "Advanced: automation and AI",
    botsIntro: ru
      ? "Автосценарии: боты сами создают задачи, откликаются и переписываются по расписанию. Нужно, только если хотите «живую» активность."
      : "Automation: bots create tasks, make offers and chat on schedule. Only needed if you want live activity.",
    master: ru ? "Автосценарии включены" : "Automation enabled",
    activity: ru ? "Интенсивность" : "Activity level",
    providerL: ru ? "AI-провайдер" : "AI provider",
    aiDaily: ru ? "Лимит токенов AI в день (0 = без лимита)" : "AI tokens/day (0 = none)",
    aiMonthly: ru ? "Лимит токенов AI в месяц (0 = без лимита)" : "AI tokens/month (0 = none)",
    aiUsage: ru ? "Расход AI" : "AI usage",
    today: ru ? "сегодня" : "today",
    month: ru ? "за месяц" : "month",
    save: ru ? "Сохранить" : "Save",
    runNow: ru ? "Прогнать сценарий сейчас" : "Run tick now",
    enableAll: ru ? "Включить всех" : "Enable all",
    disableAll: ru ? "Выключить всех" : "Disable all",
    confirmDisableAll: ru ? "Выключить всех ботов?" : "Disable all bots?",
    actionLog: ru ? "Активность ботов" : "Bot activity",
    actionLogEmpty: ru ? "Активности пока нет." : "No activity yet.",
    local: ru ? "Локально (без AI)" : "Local (no AI)",
  };
}

export default async function TestUsersSection({ locale, filter }: { locale: Locale; filter: TestFilter }) {
  const l = tr(locale);
  const t = getDict(locale);

  const [stats, categoriesRaw, rows, audit, botConfig, botActivity, aiUsage] = await Promise.all([
    testStats(locale),
    prisma.category.findMany(),
    listTestUsers(filter),
    recentAudit(12),
    getBotConfig(),
    recentBotActivity(20),
    getAiUsage(),
  ]);
  const categories = sortByCategoryOrder(categoriesRaw).map((c) => ({
    slug: c.slug,
    label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn),
  }));
  const catLabel = (slug: string | null) => (slug ? categories.find((c) => c.slug === slug)?.label ?? slug : "—");

  const href = (role?: string, cat?: string) => {
    const p = new URLSearchParams({ tab: "testUsers" });
    if (role) p.set("turole", role);
    if (cat) p.set("tucat", cat);
    return `/admin?${p.toString()}`;
  };

  return (
    <div className="tu">
      <p className="sub">{l.intro}</p>

      {/* Статистика */}
      <div className="tu-stats">
        <div className="statbox"><b>{stats.total}</b><span>{l.statTotal}</span></div>
        <div className="statbox"><b>{stats.providers}</b><span>{l.statProviders}</span></div>
        <div className="statbox"><b>{stats.clients}</b><span>{l.statClients}</span></div>
        <div className="statbox"><b>{stats.listings}</b><span>{l.statListings}</span></div>
        <div className="statbox"><b>{stats.tasks}</b><span>{l.statTasks}</span></div>
      </div>
      {stats.byCategory.length > 0 && (
        <div className="tu-chips">
          <span className="tu-muted">{l.byCategory}:</span>
          {stats.byCategory.map((c) => (
            <span className="chip" key={c.slug}>{catLabel(c.slug)}: {c.count}</span>
          ))}
        </div>
      )}

      {/* Показ на сайте (демо) */}
      <div className={"tu-demo" + (botConfig.demoMode ? " on" : "")}>
        <div>
          <b>{botConfig.demoMode ? l.demoOn : l.demoOff}</b>
          <p className="tu-muted">{l.demoHint}</p>
        </div>
        <form action={setDemoModeAction.bind(null, !botConfig.demoMode)}>
          <button className={"btn btn-sm " + (botConfig.demoMode ? "btn-line" : "btn-green")}>
            {botConfig.demoMode ? l.hideFromSite : l.showOnSite}
          </button>
        </form>
      </div>

      {/* Создание */}
      <h3 className="tu-h">{l.createTitle}</h3>
      <CreateForm categories={categories} cities={[...TEST_CITIES]} ru={locale === "ru"} />

      {/* Фото и описания */}
      <div className="tu-botbtns" style={{ alignItems: "center" }}>
        <form action={fillTestUsersMediaAction}><button className="btn btn-green btn-sm">{l.fillMedia}</button></form>
        <span className="tu-muted">{l.fillMediaHint}</span>
      </div>

      {/* Список + удаление */}
      <div className="tu-listhead">
        <h3 className="tu-h">{l.listTitle}</h3>
        {rows.length > 0 && (
          <form action={deleteAllTestUsersAction}>
            <ConfirmButton message={l.confirmDeleteAll} className="btn btn-red btn-sm">{l.deleteAll}</ConfirmButton>
          </form>
        )}
      </div>

      <div className="chips" style={{ marginBottom: 10 }}>
        <Link href={href(undefined, filter.categorySlug)} className={"chip" + (!filter.role ? " on" : "")}>{l.filterAll}</Link>
        <Link href={href("provider", filter.categorySlug)} className={"chip" + (filter.role === "provider" ? " on" : "")}>{l.roleProviders}</Link>
        <Link href={href("client", filter.categorySlug)} className={"chip" + (filter.role === "client" ? " on" : "")}>{l.roleClients}</Link>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        <Link href={href(filter.role)} className={"chip" + (!filter.categorySlug ? " on" : "")}>{l.filterAll}</Link>
        {categories.map((c) => (
          <Link key={c.slug} href={href(filter.role, c.slug)} className={"chip" + (filter.categorySlug === c.slug ? " on" : "")}>{c.label}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">{l.empty}</div>
      ) : (
        <>
          <form id="tuDelete" action={deleteSelectedTestUsersAction} />
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th></th>
                  <th>{l.colName}</th>
                  <th>{l.colRole}</th>
                  <th>{l.colCity}</th>
                  <th>{l.colCategory}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><input type="checkbox" name="id" value={r.id} form="tuDelete" /></td>
                    <td>{r.name}</td>
                    <td>{r.isProvider ? l.provider : l.client}</td>
                    <td>{r.city ?? "—"}</td>
                    <td>{catLabel(r.category)}</td>
                    <td>
                      <form action={deleteOneTestUserAction.bind(null, r.id)}>
                        <ConfirmButton message={l.confirmDeleteOne} className="btn btn-line btn-sm">{l.deleteOne}</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}>
            <ConfirmButton message={l.confirmDeleteSel} className="btn btn-red btn-sm" form="tuDelete">{l.deleteSelected}</ConfirmButton>
          </div>
        </>
      )}

      {/* Последние действия (для диагностики) */}
      <h3 className="tu-h">{l.auditTitle}</h3>
      {audit.length === 0 ? (
        <div className="empty">{l.auditEmpty}</div>
      ) : (
        <ul className="tu-audit">
          {audit.map((a) => (
            <li key={a.id}>
              <span className={"pill " + (a.action.includes("error") || a.action === "delete" ? "dec" : "ok")}>{a.action}</span>
              <span className="tu-audit-count">{a.count}</span>
              <span className="tu-muted">{a.detail}</span>
              <span className="tu-audit-time">{a.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Дополнительно: автосценарии и AI (по умолчанию свёрнуто) */}
      <details className="tu-details">
        <summary>{l.advanced}</summary>
        <p className="tu-muted" style={{ margin: "10px 0" }}>{l.botsIntro}</p>
        <form action={saveBotConfigAction} className="tu-form">
          <div className="tu-grid">
            <label className="tu-check">
              <input type="checkbox" name="enabled" defaultChecked={botConfig.enabled} /> <span>{l.master}</span>
            </label>
            <label>
              <span>{l.activity}: {botConfig.activityLevel}</span>
              <input type="range" name="activityLevel" min={0} max={100} step={5} defaultValue={botConfig.activityLevel} />
            </label>
            <label>
              <span>{l.providerL}</span>
              <select name="provider" defaultValue={botConfig.provider}>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="local">{l.local}</option>
              </select>
            </label>
            <label>
              <span>{l.aiDaily}</span>
              <input type="number" name="aiDailyTokenLimit" min={0} step={10000} defaultValue={botConfig.aiDailyTokenLimit} />
            </label>
            <label>
              <span>{l.aiMonthly}</span>
              <input type="number" name="aiMonthlyTokenLimit" min={0} step={100000} defaultValue={botConfig.aiMonthlyTokenLimit} />
            </label>
          </div>
          {/* Демо-режим здесь тоже сохраняется как есть, чтобы не сбрасывался. */}
          <input type="hidden" name="demoMode" value={botConfig.demoMode ? "on" : ""} />
          <div className="tu-chips" style={{ marginTop: 10 }}>
            <span className="tu-muted">{l.aiUsage}:</span>
            <span className="chip">{l.today}: {aiUsage.todayTokens.toLocaleString()}</span>
            <span className="chip">{l.month}: {aiUsage.monthTokens.toLocaleString()}</span>
          </div>
          <div className="tu-botbtns" style={{ marginTop: 10 }}>
            <button className="btn btn-green btn-sm">{l.save}</button>
          </div>
        </form>
        <div className="tu-botbtns">
          <form action={runBotTickAction}><button className="btn btn-ink btn-sm">{l.runNow}</button></form>
          <form action={toggleAllBotsAction}><input type="hidden" name="enabled" value="1" /><button className="btn btn-sm">{l.enableAll}</button></form>
          <form action={toggleAllBotsAction}><input type="hidden" name="enabled" value="0" /><ConfirmButton message={l.confirmDisableAll} className="btn btn-sm">{l.disableAll}</ConfirmButton></form>
        </div>

        <h4 className="tu-h" style={{ fontSize: 14 }}>{l.actionLog}</h4>
        {botActivity.length === 0 ? (
          <div className="empty">{l.actionLogEmpty}</div>
        ) : (
          <ul className="tu-audit">
            {botActivity.map((a) => (
              <li key={a.id}>
                <span className={"pill " + (a.action === "self_disabled" ? "dec" : "ok")}>{a.action}</span>
                <span className="tu-muted">{a.detail}</span>
                <span className="tu-audit-time">{a.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}

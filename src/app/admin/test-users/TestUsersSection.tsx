// Раздел админки «Тестовые пользователи»: создание, статистика, фильтры,
// список с массовым удалением и журнал аудита. Данные - через src/lib/test-users.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sortByCategoryOrder } from "@/components/categories";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import {
  listTestUsers,
  recentAudit,
  testStats,
  TEST_CITIES,
  type CreateRole,
} from "@/lib/test-users";
import { getBotConfig, recentBotActivity } from "@/lib/test-users/bots";
import CreateForm from "./CreateForm";
import {
  deleteAllTestUsersAction,
  deleteSelectedTestUsersAction,
  runBotTickAction,
  saveBotConfigAction,
  toggleAllBotsAction,
  toggleBotAction,
} from "./actions";

export type TestFilter = { role?: CreateRole; categorySlug?: string };

function tr(locale: Locale) {
  const ru = locale === "ru";
  return {
    heading: ru ? "Тестовые пользователи" : "Test users",
    intro: ru
      ? "Синтетические аккаунты для демонстрации, тестирования и наполнения. Помечены скрытым флагом и исключены из поиска, рейтингов, отзывов и статистики платформы. Без доступа к платежам."
      : "Synthetic accounts for demo, testing and seeding. Flagged as hidden and excluded from search, ratings, reviews and platform stats. No access to payments.",
    statTotal: ru ? "Всего аккаунтов" : "Total accounts",
    statProviders: ru ? "Исполнители" : "Providers",
    statClients: ru ? "Клиенты" : "Clients",
    statListings: ru ? "Услуги" : "Listings",
    statTasks: ru ? "Задачи" : "Tasks",
    createTitle: ru ? "Создать аккаунты" : "Create accounts",
    listTitle: ru ? "Список" : "List",
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
    deleteAll: ru ? "Удалить все тестовые" : "Delete all test users",
    empty: ru ? "Тестовых аккаунтов пока нет." : "No test accounts yet.",
    auditTitle: ru ? "Журнал действий" : "Audit log",
    auditEmpty: ru ? "Действий пока нет." : "No actions yet.",
    byCategory: ru ? "По категориям" : "By category",
    botsTitle: ru ? "Автосценарии (боты)" : "Automation (bots)",
    botsIntro: ru
      ? "Боты сами создают задачи, откликаются, принимают отклики и обмениваются сообщениями по расписанию (ежедневный cron) или по кнопке. При появлении реального пользователя с теми же параметрами бот сам отключается."
      : "Bots create tasks, make and accept offers and exchange messages on schedule or on demand. A bot self-disables when a real user with the same parameters appears.",
    master: ru ? "Боты включены" : "Bots enabled",
    activity: ru ? "Интенсивность" : "Activity level",
    providerL: ru ? "AI-провайдер" : "AI provider",
    save: ru ? "Сохранить" : "Save",
    runNow: ru ? "Прогнать сценарий сейчас" : "Run tick now",
    enableAll: ru ? "Включить всех" : "Enable all",
    disableAll: ru ? "Выключить всех" : "Disable all",
    botOn: ru ? "вкл" : "on",
    botOff: ru ? "выкл" : "off",
    colBot: ru ? "Бот" : "Bot",
    actionLog: ru ? "Активность ботов" : "Bot activity",
    actionLogEmpty: ru ? "Активности пока нет." : "No activity yet.",
  };
}

export default async function TestUsersSection({
  locale,
  filter,
}: {
  locale: Locale;
  filter: TestFilter;
}) {
  const l = tr(locale);
  const t = getDict(locale);

  const [stats, categoriesRaw, rows, audit, botConfig, botActivity] = await Promise.all([
    testStats(locale),
    prisma.category.findMany(),
    listTestUsers(filter),
    recentAudit(15),
    getBotConfig(),
    recentBotActivity(25),
  ]);
  const categories = sortByCategoryOrder(categoriesRaw).map((c) => ({
    slug: c.slug,
    label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn),
  }));
  const catLabel = (slug: string | null) =>
    slug ? categories.find((c) => c.slug === slug)?.label ?? slug : "—";

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
            <span className="chip" key={c.slug}>
              {catLabel(c.slug)}: {c.count}
            </span>
          ))}
        </div>
      )}

      {/* Автосценарии (боты) */}
      <h3 className="tu-h">{l.botsTitle}</h3>
      <p className="tu-muted" style={{ marginBottom: 10 }}>{l.botsIntro}</p>
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
              <option value="local">{locale === "ru" ? "Локально (без AI)" : "Local (no AI)"}</option>
            </select>
          </label>
        </div>
        <div className="tu-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-green">{l.save}</button>
        </div>
      </form>
      <div className="tu-botbtns">
        <form action={runBotTickAction}><button className="btn btn-ink btn-sm">{l.runNow}</button></form>
        <form action={toggleAllBotsAction}><input type="hidden" name="enabled" value="1" /><button className="btn btn-sm">{l.enableAll}</button></form>
        <form action={toggleAllBotsAction}><input type="hidden" name="enabled" value="0" /><button className="btn btn-sm">{l.disableAll}</button></form>
      </div>

      {/* Создание */}
      <h3 className="tu-h">{l.createTitle}</h3>
      <CreateForm categories={categories} cities={[...TEST_CITIES]} />

      {/* Список + фильтры */}
      <div className="tu-listhead">
        <h3 className="tu-h">{l.listTitle}</h3>
        <form action={deleteAllTestUsersAction}>
          <button className="btn btn-red btn-sm">{l.deleteAll}</button>
        </form>
      </div>

      <div className="chips" style={{ marginBottom: 10 }}>
        <Link href={href(undefined, filter.categorySlug)} className={"chip" + (!filter.role ? " on" : "")}>{l.filterAll}</Link>
        <Link href={href("provider", filter.categorySlug)} className={"chip" + (filter.role === "provider" ? " on" : "")}>{l.roleProviders}</Link>
        <Link href={href("client", filter.categorySlug)} className={"chip" + (filter.role === "client" ? " on" : "")}>{l.roleClients}</Link>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        <Link href={href(filter.role)} className={"chip" + (!filter.categorySlug ? " on" : "")}>{l.filterAll}</Link>
        {categories.map((c) => (
          <Link key={c.slug} href={href(filter.role, c.slug)} className={"chip" + (filter.categorySlug === c.slug ? " on" : "")}>
            {c.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">{l.empty}</div>
      ) : (
        <>
          {/* Форма массового удаления: чекбоксы привязаны к ней через form="tuDelete",
              поэтому таблицу не нужно оборачивать (тоггл бота - своя форма в строке). */}
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
                  <th>{l.colBot}</th>
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
                      <form action={toggleBotAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="enabled" value={r.botEnabled ? "0" : "1"} />
                        <button className={"btn btn-sm " + (r.botEnabled ? "btn-green" : "btn-red")}>
                          {r.botEnabled ? l.botOn : l.botOff}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-red btn-sm" form="tuDelete">{l.deleteSelected}</button>
          </div>
        </>
      )}

      {/* Аудит */}
      <h3 className="tu-h">{l.auditTitle}</h3>
      {audit.length === 0 ? (
        <div className="empty">{l.auditEmpty}</div>
      ) : (
        <ul className="tu-audit">
          {audit.map((a) => (
            <li key={a.id}>
              <span className={"pill " + (a.action === "delete" ? "dec" : "ok")}>{a.action}</span>
              <span className="tu-audit-count">{a.count}</span>
              <span className="tu-muted">{a.detail}</span>
              <span className="tu-audit-time">{a.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Мониторинг действий ботов */}
      <h3 className="tu-h">{l.actionLog}</h3>
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
    </div>
  );
}

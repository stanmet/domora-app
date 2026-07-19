// Минимальная админка Domora: модерация услуг, пользователи и исполнители,
// заказы с возвратами. Доступ только роли ADMIN. Дизайн в стиле проекта
// (globals.css), тексты на английском и русском (см. i18n.ts).
import Link from "next/link";
import { ClipboardCheck, Flag, FlaskConical, LayoutGrid, ShieldCheck, Star, Tags, UserCog, Users } from "lucide-react";
import { ListingStatus, PriceUnit, ProviderStatus, UserStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { getDict, categoryLabel, unitLabel } from "@/i18n/dictionaries";
import { eur } from "@/lib/format";
import { statusPillClass } from "@/lib/booking-units";
import { bookingRef } from "@/lib/booking-ref";
import { sortByCategoryOrder } from "@/components/categories";
import { requireAdmin, hasScope, type AdminScope } from "@/lib/admin";
import { getAdminDict, adminStatus } from "./i18n";
import {
  approveListing,
  createCategory,
  deleteBooking,
  deleteUser,
  resolveComplaint,
  setProviderFrozen,
  setUserFrozen,
  updateCategory,
} from "./actions";
import RejectForm from "./RejectForm";
import ConfirmAction from "@/components/ConfirmAction";
import TestUsersSection, { type TestFilter } from "./test-users/TestUsersSection";
import AdminsSection from "./admins/AdminsSection";
import type { CreateRole } from "@/lib/test-users";

export const dynamic = "force-dynamic";

type Tab = "moderation" | "complaints" | "users" | "providers" | "bookings" | "categories" | "testUsers" | "admins";
const TABS: Tab[] = ["moderation", "complaints", "users", "providers", "bookings", "categories", "testUsers", "admins"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; turole?: string; tucat?: string }>;
}) {
  const me = await requireAdmin();

  const locale = await getLocale();
  const t = getDict(locale);
  const at = getAdminDict(locale);

  // Каждой вкладке соответствует одноимённое право доступа.
  const allowed = TABS.filter((k) => hasScope(me, k as AdminScope));

  const { tab: tabParam, turole, tucat } = await searchParams;
  const requested = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : allowed[0];
  const tab: Tab = allowed.includes(requested) ? requested : allowed[0];
  const testFilter: TestFilter = {
    role: turole === "provider" || turole === "client" ? (turole as CreateRole) : undefined,
    categorySlug: tucat || undefined,
  };

  const tabMeta: Record<Tab, { label: string; icon: typeof ShieldCheck }> = {
    moderation: { label: at.tabModeration, icon: ShieldCheck },
    complaints: { label: at.tabComplaints, icon: Flag },
    users: { label: at.tabUsers, icon: Users },
    providers: { label: at.tabProviders, icon: LayoutGrid },
    bookings: { label: at.tabBookings, icon: ClipboardCheck },
    categories: { label: at.tabCategories, icon: Tags },
    testUsers: { label: locale === "ru" ? "Тестовые" : "Test users", icon: FlaskConical },
    admins: { label: locale === "ru" ? "Администраторы" : "Administrators", icon: UserCog },
  };

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 900, paddingBottom: 64 }}>
        <h1 className="page">{at.title}</h1>
        <p className="sub">{at.sub}</p>

        <div className="tabs" style={{ marginTop: 4 }}>
          {allowed.map((k) => {
            const Icon = tabMeta[k].icon;
            return (
              <Link key={k} href={`/admin?tab=${k}`} className={"tab" + (tab === k ? " on" : "")}>
                <Icon size={16} /> {tabMeta[k].label}
              </Link>
            );
          })}
        </div>

        {tab === "moderation" && <Moderation locale={locale} t={t} at={at} />}
        {tab === "complaints" && <Complaints at={at} />}
        {tab === "users" && <UsersList at={at} />}
        {tab === "providers" && <ProvidersList at={at} />}
        {tab === "bookings" && <BookingsList locale={locale} at={at} />}
        {tab === "categories" && <Categories locale={locale} at={at} />}
        {tab === "testUsers" && <TestUsersSection locale={locale} filter={testFilter} />}
        {tab === "admins" && <AdminsSection locale={locale} meId={me.id} />}
      </div>
    </main>
  );
}

async function Moderation({
  locale,
  t,
  at,
}: {
  locale: Awaited<ReturnType<typeof getLocale>>;
  t: ReturnType<typeof getDict>;
  at: ReturnType<typeof getAdminDict>;
}) {
  const listings = await prisma.listing.findMany({
    where: { status: ListingStatus.MODERATION },
    orderBy: { createdAt: "asc" },
    include: {
      provider: { select: { displayName: true, user: { select: { email: true } } } },
      category: { select: { slug: true, nameEn: true, nameRu: true } },
    },
  });

  if (listings.length === 0) return <div className="empty">{at.modEmpty}</div>;

  return (
    <div className="adm-list">
      {listings.map((l) => (
        <div className="adm-card" key={l.id}>
          <div className="adm-main">
            <h4>{l.professionLabel ? `${l.professionLabel} · ${l.title}` : l.title}</h4>
            {l.description && <p className="adm-desc">{l.description}</p>}
            <div className="adm-meta">
              <span>
                {at.modProvider}: {l.provider.displayName}
              </span>
              <span>
                {at.modCategory}: {categoryLabel(t, l.category.slug, locale === "ru" ? l.category.nameRu : l.category.nameEn)}
              </span>
              <span>
                {at.modPrice}: {eur(l.priceCents, locale)}
              </span>
            </div>
          </div>
          <div className="adm-actions">
            <form action={approveListing.bind(null, l.id)}>
              <button className="btn btn-green btn-sm">{at.approve}</button>
            </form>
            <RejectForm listingId={l.id} t={at} />
          </div>
        </div>
      ))}
    </div>
  );
}

async function UsersList({ at }: { at: ReturnType<typeof getAdminDict> }) {
  const users = await prisma.user.findMany({
    where: { isTest: false }, // тестовые аккаунты - в отдельной вкладке
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, email: true, roles: true, status: true },
  });

  if (users.length === 0) return <div className="empty">{at.usersEmpty}</div>;

  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>{at.colName}</th>
            <th>{at.colEmail}</th>
            <th>{at.colRoles}</th>
            <th>{at.colStatus}</th>
            <th>{at.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const frozen = u.status === UserStatus.FROZEN;
            const isAdmin = u.roles.includes(Role.ADMIN);
            return (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="adm-mono">{u.email}</td>
                <td>{u.roles.join(", ")}</td>
                <td>
                  <span className={"pill " + (frozen ? "dec" : "ok")}>{adminStatus(at, u.status)}</span>
                </td>
                <td>
                  {isAdmin ? (
                    <span className="adm-muted">—</span>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <form action={setUserFrozen.bind(null, u.id, !frozen)}>
                        <button className={"btn btn-sm " + (frozen ? "btn-green" : "btn-red")}>
                          {frozen ? at.unblock : at.freeze}
                        </button>
                      </form>
                      <ConfirmAction
                        action={deleteUser.bind(null, u.id)}
                        label={at.userDelete}
                        warning={at.userDeleteWarn}
                        confirmLabel={at.userDeleteConfirm}
                        backLabel={at.back}
                      />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function ProvidersList({ at }: { at: ReturnType<typeof getAdminDict> }) {
  const providers = await prisma.providerProfile.findMany({
    where: { user: { isTest: false } }, // тестовые аккаунты - в отдельной вкладке
    orderBy: { displayName: "asc" },
    take: 200,
    select: {
      userId: true,
      displayName: true,
      city: true,
      status: true,
      user: { select: { email: true } },
    },
  });

  if (providers.length === 0) return <div className="empty">{at.providersEmpty}</div>;

  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>{at.colName}</th>
            <th>{at.colEmail}</th>
            <th>{at.colCity}</th>
            <th>{at.colStatus}</th>
            <th>{at.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => {
            const frozen = p.status === ProviderStatus.FROZEN;
            return (
              <tr key={p.userId}>
                <td>{p.displayName}</td>
                <td className="adm-mono">{p.user.email}</td>
                <td>{p.city}</td>
                <td>
                  <span className={"pill " + (frozen ? "dec" : p.status === ProviderStatus.ACTIVE ? "ok" : "req")}>
                    {adminStatus(at, p.status)}
                  </span>
                </td>
                <td>
                  <form action={setProviderFrozen.bind(null, p.userId, !frozen)}>
                    <button className={"btn btn-sm " + (frozen ? "btn-green" : "btn-red")}>
                      {frozen ? at.unblock : at.freeze}
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function BookingsList({
  locale,
  at,
}: {
  locale: Awaited<ReturnType<typeof getLocale>>;
  at: ReturnType<typeof getAdminDict>;
}) {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      client: { select: { name: true } },
      provider: { select: { displayName: true } },
      listing: { select: { title: true } },
    },
  });

  if (bookings.length === 0) return <div className="empty">{at.bookingsEmpty}</div>;

  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>{at.colClient}</th>
            <th>{at.modProvider}</th>
            <th>{at.colService}</th>
            <th>{at.colAmount}</th>
            <th>{at.colStatus}</th>
            <th>{at.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.client.name}</td>
              <td>{b.provider.displayName}</td>
              <td>
                {b.listing.title}
                <div className="adm-mono" style={{ fontSize: 11, color: "var(--muted)" }}>#{bookingRef(b)}</div>
              </td>
              <td className="adm-nowrap">{eur(b.totalCents, locale)}</td>
              <td>
                <span className={"pill " + statusPillClass(b.status)}>{adminStatus(at, b.status)}</span>
              </td>
              <td>
                <ConfirmAction
                  action={deleteBooking.bind(null, b.id)}
                  label={at.bookingDelete}
                  warning={at.bookingDeleteWarn}
                  confirmLabel={at.bookingDeleteConfirm}
                  backLabel={at.back}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Категории: создание новой и редактирование существующих (название EN/RU и
// единица по умолчанию). Slug у существующих не меняем, чтобы не ломать ссылки.
async function Categories({
  locale,
  at,
}: {
  locale: Awaited<ReturnType<typeof getLocale>>;
  at: ReturnType<typeof getAdminDict>;
}) {
  const t = getDict(locale);
  const cats = sortByCategoryOrder(await prisma.category.findMany());
  const units = Object.values(PriceUnit);

  return (
    <div className="adm-list">
      <form action={createCategory} className="adm-card" style={{ display: "block" }}>
        <h4 style={{ marginTop: 0 }}>{at.catNewTitle}</h4>
        <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <input name="slug" className="f" placeholder={at.catSlug} required maxLength={40} />
          <input name="nameEn" className="f" placeholder={at.catNameEn} required maxLength={60} />
          <input name="nameRu" className="f" placeholder={at.catNameRu} required maxLength={60} />
          <select name="unitDefault" className="f" defaultValue="PER_HOUR">
            {units.map((u) => (
              <option key={u} value={u}>
                {unitLabel(t, u)}
              </option>
            ))}
          </select>
          <button className="btn btn-green btn-sm">{at.catCreate}</button>
        </div>
      </form>

      <h4 style={{ margin: "8px 0 0" }}>{at.catListTitle}</h4>
      {cats.map((c) => (
        <form key={c.id} action={updateCategory.bind(null, c.id)} className="adm-card" style={{ display: "block" }}>
          <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
            <div className="adm-mono" style={{ fontSize: 12, color: "var(--muted)" }}>{c.slug}</div>
            <input name="nameEn" className="f" defaultValue={c.nameEn} required maxLength={60} />
            <input name="nameRu" className="f" defaultValue={c.nameRu} required maxLength={60} />
            <select name="unitDefault" className="f" defaultValue={c.unitDefault}>
              {units.map((u) => (
                <option key={u} value={u}>
                  {unitLabel(t, u)}
                </option>
              ))}
            </select>
            <button className="btn btn-line btn-sm">{at.catSave}</button>
          </div>
        </form>
      ))}
    </div>
  );
}

// Жалобы: отзывы, помеченные адресатом на модерацию (disputeFlag). Админ может
// удалить отзыв (с пересчётом рейтинга) или отклонить жалобу (снять флаг).
async function Complaints({ at }: { at: ReturnType<typeof getAdminDict> }) {
  const flagged = await prisma.review.findMany({
    where: { disputeFlag: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
    include: {
      author: { select: { name: true } },
      target: { select: { name: true } },
      booking: { select: { listing: { select: { title: true } } } },
    },
  });

  if (flagged.length === 0) return <div className="empty">{at.cmpEmpty}</div>;

  return (
    <div className="adm-list">
      {flagged.map((r) => (
        <div className="adm-card" key={r.id}>
          <div className="adm-main">
            <h4>
              {at.cmpAbout} {r.target.name}
            </h4>
            <div className="adm-meta">
              <span className="rate">
                <Star size={12} fill="currentColor" /> {r.stars}
              </span>
              <span>{r.author.name}</span>
              <span>{r.booking.listing.title}</span>
            </div>
            {r.text && <p style={{ marginTop: 6 }}>{r.text}</p>}
          </div>
          <div className="adm-actions">
            <form action={resolveComplaint.bind(null, r.id, "delete")}>
              <button className="btn btn-red btn-sm">{at.cmpDelete}</button>
            </form>
            <form action={resolveComplaint.bind(null, r.id, "dismiss")}>
              <button className="btn btn-line btn-sm">{at.cmpDismiss}</button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

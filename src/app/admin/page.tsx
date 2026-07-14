// Минимальная админка Domora: модерация услуг, пользователи и исполнители,
// заказы с возвратами. Доступ только роли ADMIN. Дизайн в стиле проекта
// (globals.css), тексты на английском и русском (см. i18n.ts).
import Link from "next/link";
import { ClipboardCheck, LayoutGrid, ShieldCheck, Users } from "lucide-react";
import { ListingStatus, ProviderStatus, UserStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { getDict, categoryLabel } from "@/i18n/dictionaries";
import { eur } from "@/lib/format";
import { statusPillClass } from "@/lib/booking-units";
import { requireAdmin } from "@/lib/admin";
import { getAdminDict, adminStatus } from "./i18n";
import { approveListing, setProviderFrozen, setUserFrozen } from "./actions";
import RejectForm from "./RejectForm";
import RefundForm from "./RefundForm";

export const dynamic = "force-dynamic";

type Tab = "moderation" | "users" | "providers" | "bookings";
const TABS: Tab[] = ["moderation", "users", "providers", "bookings"];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();

  const locale = await getLocale();
  const t = getDict(locale);
  const at = getAdminDict(locale);

  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "moderation";

  const tabMeta: Record<Tab, { label: string; icon: typeof ShieldCheck }> = {
    moderation: { label: at.tabModeration, icon: ShieldCheck },
    users: { label: at.tabUsers, icon: Users },
    providers: { label: at.tabProviders, icon: LayoutGrid },
    bookings: { label: at.tabBookings, icon: ClipboardCheck },
  };

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 900, paddingBottom: 64 }}>
        <h1 className="page">{at.title}</h1>
        <p className="sub">{at.sub}</p>

        <div className="tabs" style={{ marginTop: 4 }}>
          {TABS.map((k) => {
            const Icon = tabMeta[k].icon;
            return (
              <Link key={k} href={`/admin?tab=${k}`} className={"tab" + (tab === k ? " on" : "")}>
                <Icon size={16} /> {tabMeta[k].label}
              </Link>
            );
          })}
        </div>

        {tab === "moderation" && <Moderation locale={locale} t={t} at={at} />}
        {tab === "users" && <UsersList at={at} />}
        {tab === "providers" && <ProvidersList at={at} />}
        {tab === "bookings" && <BookingsList locale={locale} at={at} />}
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
                    <form action={setUserFrozen.bind(null, u.id, !frozen)}>
                      <button className={"btn btn-sm " + (frozen ? "btn-green" : "btn-red")}>
                        {frozen ? at.unblock : at.freeze}
                      </button>
                    </form>
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
      payment: { select: { id: true, status: true, amountCents: true } },
    },
  });

  if (bookings.length === 0) return <div className="empty">{at.bookingsEmpty}</div>;

  // Возвраты по каждому платежу одним запросом.
  const paymentIds = bookings.map((b) => b.payment?.id).filter((id): id is string => !!id);
  const refundRows = paymentIds.length
    ? await prisma.refund.groupBy({ by: ["paymentId"], where: { paymentId: { in: paymentIds } }, _sum: { amountCents: true } })
    : [];
  const refundedByPayment = new Map(refundRows.map((r) => [r.paymentId, r._sum.amountCents ?? 0]));

  const CAPTURED_LIKE = ["CAPTURED", "PARTIAL_REFUND"];

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
            <th>{at.colRefunded}</th>
            <th>{at.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const refunded = b.payment ? refundedByPayment.get(b.payment.id) ?? 0 : 0;
            const remaining = b.payment ? b.payment.amountCents - refunded : 0;
            const canRefund = !!b.payment && CAPTURED_LIKE.includes(b.payment.status) && remaining > 0;
            return (
              <tr key={b.id}>
                <td>{b.client.name}</td>
                <td>{b.provider.displayName}</td>
                <td>{b.listing.title}</td>
                <td className="adm-nowrap">{eur(b.totalCents, locale)}</td>
                <td>
                  <span className={"pill " + statusPillClass(b.status)}>{adminStatus(at, b.status)}</span>
                </td>
                <td className="adm-nowrap">{refunded > 0 ? eur(refunded, locale) : "—"}</td>
                <td>
                  {canRefund ? (
                    <RefundForm bookingId={b.id} remainingEuros={(remaining / 100).toFixed(2)} t={at} />
                  ) : (
                    <span className="adm-muted">{b.payment ? "—" : at.noPayment}</span>
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

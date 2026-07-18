// Раздел «Администраторы»: список админов с их правами, выдача и снятие прав.
// Доступен только суперадминам (право "admins").
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/config";
import { ADMIN_SCOPES, isSuperAdmin } from "@/lib/admin";
import GrantForm, { type ScopeOption } from "./GrantForm";
import { revokeAdminAction } from "./actions";

const SCOPE_LABELS_RU: Record<string, string> = {
  moderation: "Модерация",
  disputes: "Споры",
  documents: "Документы",
  users: "Пользователи",
  providers: "Исполнители",
  bookings: "Заказы",
  testUsers: "Тестовые",
  admins: "Администраторы",
};

export default async function AdminsSection({ locale, meId }: { locale: Locale; meId: string }) {
  const ru = locale === "ru";
  const scopeLabel = (s: string) => (ru ? SCOPE_LABELS_RU[s] ?? s : s);
  const scopeOptions: ScopeOption[] = ADMIN_SCOPES.filter((s) => s !== "admins").map((s) => ({
    value: s,
    label: scopeLabel(s),
  }));
  // "admins" тоже можно выдать явно (право управлять админами без полного доступа).
  scopeOptions.push({ value: "admins", label: scopeLabel("admins") });

  const admins = await prisma.user.findMany({
    where: { roles: { has: Role.ADMIN } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, adminScopes: true },
  });

  return (
    <div className="tu">
      <p className="sub">
        {ru
          ? "Назначение администраторов и точечных прав. «Полный доступ» = все разделы. Права можно ограничить конкретными разделами."
          : "Manage administrators and their scoped permissions. Full access = all sections."}
      </p>

      <h3 className="tu-h">{ru ? "Выдать права" : "Grant access"}</h3>
      <GrantForm scopes={scopeOptions} />

      <h3 className="tu-h">{ru ? "Администраторы" : "Administrators"}</h3>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>{ru ? "Имя" : "Name"}</th>
              <th>Email</th>
              <th>{ru ? "Права" : "Scopes"}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td className="adm-mono">{a.email}</td>
                <td>
                  {isSuperAdmin(a) ? (
                    <span className="pill ok">{ru ? "Полный доступ" : "Full"}</span>
                  ) : (
                    <span className="tu-scopelist">{a.adminScopes.map(scopeLabel).join(", ")}</span>
                  )}
                </td>
                <td>
                  {a.id === meId ? (
                    <span className="adm-muted">{ru ? "это вы" : "you"}</span>
                  ) : (
                    <form action={revokeAdminAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="btn btn-red btn-sm">{ru ? "Снять" : "Revoke"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

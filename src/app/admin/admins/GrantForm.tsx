"use client";

// Форма выдачи прав администратора: email + набор разделов или полный доступ.
import { useActionState } from "react";
import { grantAdminAction, type AdminState } from "./actions";

export interface ScopeOption {
  value: string;
  label: string;
}

export default function GrantForm({ scopes }: { scopes: ScopeOption[] }) {
  const [state, action] = useActionState<AdminState, FormData>(grantAdminAction, null);
  return (
    <form action={action} className="tu-form">
      <div className="tu-grid">
        <label>
          <span>Email пользователя</span>
          <input type="email" name="email" placeholder="admin@example.com" required />
        </label>
        <label className="tu-check">
          <input type="checkbox" name="full" /> <span>Полный доступ (суперадмин)</span>
        </label>
      </div>
      <div className="tu-scopes">
        <span className="tu-muted">Или отдельные разделы:</span>
        <div className="tu-scopes-grid">
          {scopes.map((s) => (
            <label key={s.value} className="tu-check">
              <input type="checkbox" name={`scope_${s.value}`} /> <span>{s.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="tu-actions">
        <button className="btn btn-green">Выдать права</button>
      </div>
      {state && <div className={"tu-note " + (state.ok ? "ok" : "err")}>{state.message}</div>}
    </form>
  );
}

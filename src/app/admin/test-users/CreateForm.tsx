"use client";

// Форма создания тестовых аккаунтов. Показывает результат генерации (в т.ч.
// какой метод сработал - AI или встроенный) через useActionState.
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTestUsersAction, type CreateState } from "./actions";

interface CatOption {
  slug: string;
  label: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-green" disabled={pending}>
      {pending ? "Создаём…" : "Создать аккаунты"}
    </button>
  );
}

export default function CreateForm({ categories, cities }: { categories: CatOption[]; cities: string[] }) {
  const [state, action] = useActionState<CreateState, FormData>(createTestUsersAction, null);

  return (
    <form action={action} className="tu-form">
      <div className="tu-grid">
        <label>
          <span>Количество (10–1000)</span>
          <input type="number" name="count" min={10} max={1000} defaultValue={20} required />
        </label>
        <label>
          <span>Роль</span>
          <select name="role" defaultValue="mixed">
            <option value="mixed">Смешанно (исполнители + клиенты)</option>
            <option value="provider">Только исполнители</option>
            <option value="client">Только клиенты (задачи)</option>
          </select>
        </label>
        <label>
          <span>Категория</span>
          <select name="category" defaultValue="">
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Город</span>
          <select name="city" defaultValue="">
            <option value="">Случайные города</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="tu-actions">
        <SubmitButton />
      </div>
      {state && <div className={"tu-note " + (state.ok ? "ok" : "err")}>{state.message}</div>}
    </form>
  );
}

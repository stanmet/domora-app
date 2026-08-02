"use client";

// Форма создания демо-ботов. Проста: количество, роль, категория, город и число
// услуг. Тексты всегда генерируются на английском встроенным генератором
// (быстро, без AI-затрат). Результат показывается через useActionState.
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTestUsersAction, type CreateState } from "./actions";

interface CatOption {
  slug: string;
  label: string;
}

function SubmitButton({ ru }: { ru: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-green" disabled={pending}>
      {pending ? (ru ? "Создаём…" : "Creating…") : ru ? "Создать" : "Create"}
    </button>
  );
}

export default function CreateForm({ categories, cities, ru }: { categories: CatOption[]; cities: string[]; ru: boolean }) {
  const [state, action] = useActionState<CreateState, FormData>(createTestUsersAction, null);

  return (
    <form action={action} className="tu-form">
      {/* Тексты - встроенный генератор на английском (без AI). */}
      <input type="hidden" name="quality" value="basic" />
      <input type="hidden" name="lang" value="en" />
      <div className="tu-grid">
        <label>
          <span>{ru ? "Количество (10–1000)" : "How many (10–1000)"}</span>
          <input type="number" name="count" min={10} max={1000} defaultValue={30} required />
        </label>
        <label>
          <span>{ru ? "Кто" : "Who"}</span>
          <select name="role" defaultValue="mixed">
            <option value="mixed">{ru ? "Смешанно (исполнители + клиенты)" : "Mixed (providers + clients)"}</option>
            <option value="provider">{ru ? "Только исполнители" : "Providers only"}</option>
            <option value="client">{ru ? "Только клиенты (задачи)" : "Clients only (tasks)"}</option>
          </select>
        </label>
        <label>
          <span>{ru ? "Категория" : "Category"}</span>
          <select name="category" defaultValue="">
            <option value="">{ru ? "Все категории" : "All categories"}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{ru ? "Город" : "City"}</span>
          <select name="city" defaultValue="">
            <option value="">{ru ? "Случайные города" : "Random cities"}</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{ru ? "Услуг на исполнителя" : "Listings per provider"}</span>
          <input type="number" name="listings" min={1} max={5} defaultValue={2} />
        </label>
      </div>
      <div className="tu-actions">
        <SubmitButton ru={ru} />
      </div>
      {state && <div className={"tu-note " + (state.ok ? "ok" : "err")}>{state.message}</div>}
    </form>
  );
}

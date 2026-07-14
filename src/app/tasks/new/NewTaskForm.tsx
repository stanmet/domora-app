"use client";

// Форма публикации задачи. Поля: категория, что нужно сделать, описание,
// желаемая дата, город, адрес, бюджет (необязательно). Оплаты здесь нет.
import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";
import { createTask, type CreateTaskState } from "./actions";

export default function NewTaskForm({
  t,
  categories,
  defaultCity,
}: {
  t: Dict;
  categories: { slug: string; label: string }[];
  defaultCity: string;
}) {
  const [state, formAction, pending] = useActionState<CreateTaskState, FormData>(createTask, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="form">
      <label htmlFor="task-cat">{t.liCat}</label>
      <select id="task-cat" name="category" className="f" defaultValue={categories[0]?.slug}>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </select>

      <label htmlFor="task-title">{t.taskWhatL}</label>
      <input id="task-title" name="title" className="f" placeholder={t.taskWhatPh} maxLength={120} required />

      <label htmlFor="task-desc">{t.liDesc}</label>
      <textarea id="task-desc" name="description" className="f" rows={3} placeholder={t.taskDescPh} maxLength={1000} />

      <label htmlFor="task-date">{t.taskDateL}</label>
      <input id="task-date" name="date" className="f" type="date" min={today} required />

      <label htmlFor="task-city">{t.taskCityL}</label>
      <input id="task-city" name="city" className="f" defaultValue={defaultCity} placeholder="Dublin" maxLength={80} required />

      <label htmlFor="task-addr">{t.addrL}</label>
      <input id="task-addr" name="address" className="f" placeholder={t.addrPh} maxLength={160} required />

      <label>{t.taskBudgetL}</label>
      <div className="budgetrow">
        <input name="budgetFrom" className="f" type="number" min="0" step="1" placeholder={t.fromCap} />
        <input name="budgetTo" className="f" type="number" min="0" step="1" placeholder={t.budgetToL} />
      </div>

      {state && "error" in state && <div className="err">{state.error}</div>}

      <div className="hold" style={{ marginTop: 18 }}>
        <ShieldCheck size={16} /> {t.taskNote}
      </div>

      <button
        type="submit"
        className="btn btn-green"
        disabled={pending}
        style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
      >
        {pending ? t.taskPublishing : t.taskPublish}
      </button>
    </form>
  );
}

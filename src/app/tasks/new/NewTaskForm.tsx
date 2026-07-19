"use client";

// Форма публикации/редактирования задачи. Поля: категория, что нужно сделать,
// описание, желаемая дата, город, адрес (необязательно), бюджет, фото. Оплаты нет.
import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";
import type { CreateTaskState } from "./actions";

export type TaskInitial = {
  category?: string;
  title?: string;
  description?: string;
  date?: string;
  city?: string;
  address?: string;
  budgetFrom?: string;
  budgetTo?: string;
};

export default function NewTaskForm({
  t,
  categories,
  defaultCity,
  action,
  initial,
  existingPhotos,
  submitLabel,
  pendingLabel,
  photosLabel,
}: {
  t: Dict;
  categories: { slug: string; label: string }[];
  defaultCity: string;
  action: (prev: CreateTaskState, formData: FormData) => Promise<CreateTaskState>;
  initial?: TaskInitial;
  existingPhotos?: string[];
  submitLabel: string;
  pendingLabel: string;
  photosLabel: string;
}) {
  const [state, formAction, pending] = useActionState<CreateTaskState, FormData>(action, null);
  const today = new Date().toISOString().slice(0, 10);
  const p = initial ?? {};
  const catExists = categories.some((c) => c.slug === p.category);

  return (
    <form action={formAction} className="form">
      <label htmlFor="task-cat">{t.liCat}</label>
      <select id="task-cat" name="category" className="f" defaultValue={catExists ? p.category : categories[0]?.slug}>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </select>

      <label htmlFor="task-title">{t.taskWhatL}</label>
      <input id="task-title" name="title" className="f" placeholder={t.taskWhatPh} maxLength={120} defaultValue={p.title ?? ""} required />

      <label htmlFor="task-desc">{t.liDesc}</label>
      <textarea id="task-desc" name="description" className="f" rows={3} placeholder={t.taskDescPh} maxLength={1000} defaultValue={p.description ?? ""} />

      <label htmlFor="task-date">{t.taskDateL}</label>
      <input id="task-date" name="date" className="f" type="date" min={today} defaultValue={p.date && p.date >= today ? p.date : ""} required />

      <label htmlFor="task-city">{t.taskCityL}</label>
      <input id="task-city" name="city" className="f" defaultValue={p.city ?? defaultCity} placeholder="Dublin" maxLength={80} required />

      <label htmlFor="task-addr">{t.addrL}</label>
      <input id="task-addr" name="address" className="f" placeholder={t.addrPh} maxLength={160} defaultValue={p.address ?? ""} />

      <label>{t.taskBudgetL}</label>
      <div className="budgetrow">
        <input name="budgetFrom" className="f" type="number" min="0" step="1" placeholder={t.fromCap} defaultValue={p.budgetFrom ?? ""} />
        <input name="budgetTo" className="f" type="number" min="0" step="1" placeholder={t.budgetToL} defaultValue={p.budgetTo ?? ""} />
      </div>

      <label htmlFor="task-photos">{photosLabel}</label>
      {existingPhotos && existingPhotos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {existingPhotos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
          ))}
        </div>
      )}
      <input id="task-photos" name="photos" className="f" type="file" accept="image/*" multiple />

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
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

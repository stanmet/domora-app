// Страница публикации задачи: форма доступна только вошедшим пользователям.
// Дизайн полей из prototypes (формы брони и услуг).
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { sortByCategoryOrder } from "@/components/categories";
import NewTaskForm from "./NewTaskForm";
import { createTask } from "./actions";

export const dynamic = "force-dynamic";

type SP = { cat?: string; city?: string; date?: string; bf?: string; bt?: string; q?: string };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<SP> }) {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/new");
  const { cat = "", city = "", date = "", bf = "", bt = "", q = "" } = await searchParams;

  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const user = await ensureDbUser(authUser, locale);

  const categories = sortByCategoryOrder(await prisma.category.findMany());
  const categoryOptions = categories.map((c) => ({
    slug: c.slug,
    label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn),
  }));

  return (
    <main className="wrap bform">
      <Link href="/tasks/mine" className="back">
        <ArrowLeft size={14} /> {t.back}
      </Link>
      <h1>{t.taskNewTitle}</h1>
      <p className="sub">{t.taskNewSub}</p>
      <NewTaskForm
        t={t}
        categories={categoryOptions}
        defaultCity={city || user.city || ""}
        action={createTask}
        initial={{ category: cat, date, budgetFrom: bf, budgetTo: bt, title: q }}
        submitLabel={t.taskPublish}
        pendingLabel={t.taskPublishing}
        photosLabel={tx.taskPhotos}
      />
    </main>
  );
}

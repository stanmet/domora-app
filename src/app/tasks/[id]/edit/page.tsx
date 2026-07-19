// Редактирование задачи: доступно только автору и только пока задача открыта.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { sortByCategoryOrder } from "@/components/categories";
import { decrypt } from "@/lib/crypto";
import NewTaskForm from "../../new/NewTaskForm";
import { updateTask } from "../../new/actions";

export const dynamic = "force-dynamic";

function safeDecrypt(payload: string | null): string {
  if (!payload) return "";
  try {
    return decrypt(payload);
  } catch {
    return "";
  }
}

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/tasks/${id}/edit`);

  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const user = await ensureDbUser(authUser, locale);

  const task = await prisma.task.findUnique({
    where: { id },
    include: { category: { select: { slug: true } } },
  });
  if (!task) notFound();
  // Редактировать может только автор и только открытую задачу.
  if (task.clientId !== user.id || task.status !== "OPEN") redirect(`/tasks/${id}`);

  const categories = sortByCategoryOrder(await prisma.category.findMany());
  const categoryOptions = categories.map((c) => ({
    slug: c.slug,
    label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn),
  }));

  const initial = {
    category: task.category.slug,
    title: task.title,
    description: task.description,
    date: task.dateWanted ? task.dateWanted.toISOString().slice(0, 10) : "",
    city: task.city,
    address: safeDecrypt(task.addressEncrypted),
    budgetFrom: task.budgetFromCents != null ? String(task.budgetFromCents / 100) : "",
    budgetTo: task.budgetToCents != null ? String(task.budgetToCents / 100) : "",
  };

  return (
    <main className="wrap bform">
      <Link href={`/tasks/${id}`} className="back">
        <ArrowLeft size={14} /> {t.back}
      </Link>
      <h1>{t.taskNewTitle}</h1>
      <p className="sub">{t.taskNewSub}</p>
      <NewTaskForm
        t={t}
        categories={categoryOptions}
        defaultCity={task.city}
        action={updateTask.bind(null, id)}
        initial={initial}
        existingPhotos={task.photos}
        submitLabel={tx.accSave}
        pendingLabel={tx.saving}
        photosLabel={tx.taskPhotos}
      />
    </main>
  );
}

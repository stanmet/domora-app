// Страница публикации задачи: форма доступна только вошедшим пользователям.
// Дизайн полей из prototypes (формы брони и услуг).
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCachedCategories } from "@/lib/categories-cache";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { sortByCategoryOrder } from "@/components/categories";
import NewTaskForm from "./NewTaskForm";
import { createTask } from "./actions";

export const dynamic = "force-dynamic";

type SP = { cat?: string; city?: string; date?: string; bf?: string; bt?: string; q?: string; to?: string };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<SP> }) {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/tasks/new");
  const { cat = "", city = "", date = "", bf = "", bt = "", q = "", to = "" } = await searchParams;

  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const user = await ensureDbUser(authUser, locale);

  const categories = sortByCategoryOrder(await getCachedCategories());
  let categoryOptions = categories.map((c) => ({
    slug: c.slug,
    label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn),
  }));

  // Адресный запрос конкретному исполнителю (кнопка «Заказать» на его странице):
  // показываем, кому запрос, и оставляем только категории, где у него есть услуга.
  let directedTo: { id: string; name: string } | null = null;
  if (to && to !== user.id) {
    const target = await prisma.providerProfile.findUnique({
      where: { userId: to },
      select: {
        displayName: true,
        status: true,
        user: { select: { roles: true } },
        listings: { where: { status: "ACTIVE" }, select: { category: { select: { slug: true } } } },
      },
    });
    if (target && target.status === "ACTIVE" && target.user.roles.includes("PROVIDER")) {
      const proSlugs = new Set(target.listings.map((l) => l.category.slug));
      const restricted = categoryOptions.filter((c) => proSlugs.has(c.slug));
      if (restricted.length > 0) {
        categoryOptions = restricted;
        directedTo = { id: to, name: target.displayName };
      }
    }
  }

  return (
    <main className="wrap bform">
      <Link href={directedTo ? `/providers/${directedTo.id}` : "/bookings?tab=active"} className="back">
        <ArrowLeft size={14} /> {t.back}
      </Link>
      <h1>{directedTo ? t.reqToProTitle : t.taskNewTitle}</h1>
      <p className="sub">{directedTo ? `${directedTo.name}. ${t.reqToProSub}` : t.taskNewSub}</p>
      <NewTaskForm
        t={t}
        categories={categoryOptions}
        defaultCity={city || user.city || ""}
        action={createTask}
        initial={{ category: cat, date, budgetFrom: bf, budgetTo: bt, title: q }}
        directedToId={directedTo?.id}
        submitLabel={directedTo ? t.svcOrder : t.taskPublish}
        pendingLabel={t.taskPublishing}
        photosLabel={tx.taskPhotos}
      />
    </main>
  );
}

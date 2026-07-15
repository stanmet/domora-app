// Раздел "Мои услуги" кабинета исполнителя: плашки услуг с переключателем
// и форма добавления. Разметка и стили из prototypes/HostDashboard.jsx (tab "listings").
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { sortByCategoryOrder } from "@/components/categories";
import { licenceFor, subcatName } from "@/lib/subcategories";
import ServicesManager from "./ServicesManager";

export const dynamic = "force-dynamic";

export default async function ProServicesPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/services");

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");

  const [categories, listings] = await Promise.all([
    prisma.category.findMany(),
    prisma.listing.findMany({
      where: { providerId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, professionLabel: true, priceCents: true, unit: true, status: true },
    }),
  ]);

  const categoryOptions = sortByCategoryOrder(categories).map((c) => ({
    slug: c.slug,
    label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn),
  }));

  // Подкатегории для выпадающего списка (зависит от выбранной категории).
  let subcategoryOptions: { slug: string; label: string; categorySlug: string; licence: string | null }[] = [];
  try {
    const subs = await prisma.subcategory.findMany({
      orderBy: { order: "asc" },
      include: { category: { select: { slug: true } } },
    });
    subcategoryOptions = subs.map((s) => ({
      slug: s.slug,
      label: subcatName(s, locale),
      categorySlug: s.category.slug,
      licence: licenceFor(s.slug),
    }));
  } catch {
    // Таблица подкатегорий ещё не готова: список остаётся пустым.
  }

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 680, paddingBottom: 64 }}>
        <Link href="/pro" className="back">
          <ArrowLeft size={14} /> {t.back}
        </Link>
        <h1 className="page">{t.myServices}</h1>
        <p className="sub">{t.svcSub}</p>
        <div className="tip" style={{ marginTop: 0 }}>
          <div className="ti">
            <Lightbulb size={18} />
          </div>
          <p>
            <b>{t.proTipB}</b> {t.svcModNote}
          </p>
        </div>
        <ServicesManager
          listings={listings}
          categories={categoryOptions}
          subcategories={subcategoryOptions}
          t={t}
          locale={locale}
        />
      </div>
    </main>
  );
}

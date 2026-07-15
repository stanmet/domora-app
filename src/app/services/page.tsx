// Дерево услуг: все категории и их подкатегории (в духе all-categories Kabanchik).
// Каждая подкатегория ведёт в каталог с фильтром.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { CATEGORY_ICONS, sortByCategoryOrder } from "@/components/categories";
import { subcatName } from "@/lib/subcategories";

export const dynamic = "force-dynamic";

type Cat = {
  id: string;
  slug: string;
  nameEn: string;
  nameRu: string;
  subcategories: { id: string; slug: string; nameEn: string; nameRu: string }[];
};

export default async function ServicesPage() {
  const locale = await getLocale();
  const t = getDict(locale);

  let categories: Cat[] = [];
  try {
    categories = (await prisma.category.findMany({
      include: { subcategories: { orderBy: { order: "asc" } } },
    })) as unknown as Cat[];
  } catch {
    // Таблица подкатегорий ещё не готова: покажем категории без веток.
    const cats = await prisma.category.findMany();
    categories = cats.map((c) => ({ ...c, subcategories: [] })) as unknown as Cat[];
  }
  const cats = sortByCategoryOrder(categories);

  return (
    <main className="wrap sec">
      <h1 className="page">{t.navServices}</h1>
      <p className="sub">{t.hiwSub}</p>

      <div className="tree">
        {cats.map((c) => {
          const Icon = CATEGORY_ICONS[c.slug] ?? CATEGORY_ICONS.other;
          const label = categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn);
          return (
            <div className="tree-cat" key={c.id}>
              <div className="tree-head">
                <span className="icircle" style={{ width: 40, height: 40, margin: 0 }}>
                  <Icon size={20} strokeWidth={1.7} />
                </span>
                <Link href={`/catalog?cat=${c.slug}`} className="tree-title">
                  {label}
                </Link>
                <Link href={`/catalog?cat=${c.slug}`} className="tree-all">
                  {t.all} <ArrowRight size={13} />
                </Link>
              </div>
              {c.subcategories.length > 0 && (
                <div className="tree-subs">
                  {c.subcategories.map((s) => (
                    <Link key={s.id} href={`/catalog?cat=${c.slug}&sub=${s.slug}`} className="tree-sub">
                      {subcatName(s, locale)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

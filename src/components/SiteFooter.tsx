// Футер в духе Kabanchik: колонки полезных ссылок, популярные категории,
// контакты и копирайт. Категории берутся из базы (при недоступной базе колонка
// категорий просто не показывается).
import Link from "next/link";
import { Clock, Mail, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { categoryLabel, type Dict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { sortByCategoryOrder } from "@/components/categories";

export default async function SiteFooter({ t, locale }: { t: Dict; locale: Locale }) {
  let categories: { slug: string; nameEn: string; nameRu: string }[] = [];
  try {
    categories = sortByCategoryOrder(await prisma.category.findMany({ select: { slug: true, nameEn: true, nameRu: true } }));
  } catch {
    // База недоступна: колонку категорий скрываем.
  }

  return (
    <footer className="site-footer">
      <div className="wrap foot-grid">
        <div className="foot-col foot-brand">
          <span className="logo">
            DOMO<span>RA</span>
          </span>
          <p>{t.footerRights}</p>
        </div>

        <div className="foot-col">
          <h4>{t.footerClients}</h4>
          <Link href="/catalog">{t.findPro}</Link>
          <Link href="/tasks/new">{t.postTask}</Link>
          <Link href="/top-performers">{t.topTitle}</Link>
          <Link href="/how-it-works">{t.navHowItWorks}</Link>
          <Link href="/safety">{t.navSafety}</Link>
        </div>

        <div className="foot-col">
          <h4>{t.footerPros}</h4>
          <Link href="/signup?role=pro">{t.becomePro}</Link>
          <Link href="/tasks">{t.taskBoard}</Link>
          <Link href="/pro/documents">{t.navDocs}</Link>
          <Link href="/taxes">{t.taxesTitle}</Link>
          <Link href="/terms">{t.navTerms}</Link>
        </div>

        {categories.length > 0 && (
          <div className="foot-col">
            <h4>{t.footerCats}</h4>
            {categories.slice(0, 6).map((c) => (
              <Link key={c.slug} href={`/catalog?cat=${c.slug}`}>
                {categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn)}
              </Link>
            ))}
          </div>
        )}

        <div className="foot-col">
          <h4>{t.footerContacts}</h4>
          <span className="foot-contact">
            <MapPin size={14} /> {t.footerLeft}
          </span>
          <a className="foot-contact" href="mailto:help@domora.ie">
            <Mail size={14} /> help@domora.ie
          </a>
          <span className="foot-contact">
            <Clock size={14} /> {t.footerHours}
          </span>
        </div>
      </div>
      <div className="wrap foot-bottom">
        <span>{t.footerRights}</span>
        <span>{t.footerPixels}</span>
      </div>
    </footer>
  );
}

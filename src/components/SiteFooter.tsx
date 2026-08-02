// Футер в духе Kabanchik: колонки полезных ссылок, популярные категории,
// контакты и копирайт. Категории берутся из базы (при недоступной базе колонка
// категорий просто не показывается).
import Link from "next/link";
import { Clock, Mail, MapPin, ShieldCheck } from "lucide-react";

// Логотип Instagram (в наборе lucide брендовые иконки убраны, поэтому inline SVG).
function InstagramIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
import { categoryLabel, type Dict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { FAQ_TITLE } from "@/i18n/faq";
import type { Locale } from "@/i18n/config";
import { sortByCategoryOrder } from "@/components/categories";
import { getCachedCategories } from "@/lib/categories-cache";

export default async function SiteFooter({ t, locale }: { t: Dict; locale: Locale }) {
  const tx = getExtra(locale);
  let categories: { slug: string; nameEn: string; nameRu: string }[] = [];
  try {
    categories = sortByCategoryOrder(await getCachedCategories());
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
          <Link href="/safety" className="foot-trust">
            <ShieldCheck size={14} /> {tx.footerSafety}
          </Link>
        </div>

        <div className="foot-col">
          <h4>{t.footerClients}</h4>
          <Link href="/catalog">{t.findPro}</Link>
          <Link href="/tasks/new">{t.postTask}</Link>
          <Link href="/top-performers">{t.topTitle}</Link>
          <Link href="/how-it-works">{t.navHowItWorks}</Link>
          <Link href="/faq">{FAQ_TITLE[locale]}</Link>
          <Link href="/safety">{t.navSafety}</Link>
        </div>

        <div className="foot-col">
          <h4>{t.footerPros}</h4>
          <Link href="/signup?role=pro">{t.becomePro}</Link>
          <Link href="/tasks">{t.taskBoard}</Link>
          <Link href="/how-it-works">{t.navHowItWorks}</Link>
          <Link href="/terms">{t.navTerms}</Link>
          <Link href="/privacy">{tx.navPrivacy}</Link>
          <Link href="/cookies">{tx.navCookies}</Link>
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
          <a className="foot-contact" href="mailto:domora.irish@gmail.com">
            <Mail size={14} /> domora.irish@gmail.com
          </a>
          <a className="foot-contact" href="https://instagram.com/domora.ie" target="_blank" rel="noopener noreferrer">
            <InstagramIcon size={14} /> @domora.ie
          </a>
          <span className="foot-contact">
            <Clock size={14} /> {t.footerHours}
          </span>
        </div>
      </div>
      <div className="wrap foot-bottom">
        <span>{t.footerRights}</span>
        {/* Юр-данные компании показываются, когда заданы (EU e-Commerce: юрлицо, CRO, адрес). */}
        {process.env.NEXT_PUBLIC_COMPANY_LEGAL ? (
          <span>{process.env.NEXT_PUBLIC_COMPANY_LEGAL}</span>
        ) : (
          <span>{tx.footerTagline}</span>
        )}
      </div>
    </footer>
  );
}

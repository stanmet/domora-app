import type { Metadata } from "next";
import Script from "next/script";
import { Archivo, Inter } from "next/font/google";
import { Role } from "@prisma/client";
import "./globals.css";

// Шрифты дизайн-системы раздаются самим приложением (next/font), без запросов к Google из браузера.
const archivo = Archivo({ subsets: ["latin"], weight: ["600", "800", "900"], variable: "--font-archivo" });
const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { getAuthUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCity } from "@/lib/city";
import { sortByCategoryOrder } from "@/components/categories";
import { IRELAND_TOWN_NAMES } from "@/lib/ireland";
import { ensureSchema } from "@/lib/ensure-schema";
import SiteNav from "@/components/SiteNav";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";

const SITE_DESC = "Verified chefs, cleaners and handymen across Ireland. Clear prices, secure card payment, real reviews.";

export const metadata: Metadata = {
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: { default: "Domora · Home services in Ireland", template: "%s · Domora" },
  description: SITE_DESC,
  applicationName: "Domora",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Domora",
    title: "Domora · Home services in Ireland",
    description: SITE_DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: "Domora · Home services in Ireland",
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDict(locale);

  // Досоздаём схему новых возможностей (портфолио, переводы, просмотры задач),
  // если её ещё нет. Работает через пул Supabase и не требует ручных шагов.
  await ensureSchema();

  // Имя и роль в шапке: из таблицы User, при недоступной базе из метаданных Supabase.
  const authUser = await getAuthUser();
  let userName: string | null = null;
  let isProvider = false;
  let isAdmin = false;
  let unreadCount = 0;
  if (authUser?.email) {
    userName = (authUser.user_metadata?.name as string | undefined) || authUser.email.split("@")[0];
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: authUser.email }, select: { id: true, name: true, roles: true } });
      if (dbUser) {
        userName = dbUser.name;
        isProvider = dbUser.roles.includes(Role.PROVIDER);
        isAdmin = dbUser.roles.includes(Role.ADMIN);
        try {
          unreadCount = await prisma.notification.count({ where: { userId: dbUser.id, readAt: null } });
        } catch {
          // Таблица уведомлений ещё не готова.
        }
      }
    } catch {
      // База недоступна: оставляем имя из метаданных.
    }
  }

  // Категории и города для разворачивающегося поиска и глобального гео.
  const city = await getCity();
  let categoryOptions: { slug: string; label: string }[] = [];
  let cities: string[] = [];
  try {
    const cats = sortByCategoryOrder(await prisma.category.findMany());
    categoryOptions = cats.map((c) => ({ slug: c.slug, label: categoryLabel(t, c.slug, locale === "ru" ? c.nameRu : c.nameEn) }));
    // Клиент выбирает свой город из главных городов Ирландии; подбор исполнителей
    // идёт по их радиусу выезда до этого города (см. src/lib/ireland.ts).
    cities = [...IRELAND_TOWN_NAMES].sort();
  } catch {
    // База недоступна: поиск покажется без списков категорий/городов.
  }

  // Аналитика: Plausible (без cookи, приватная). Подключается только если задан
  // домен NEXT_PUBLIC_PLAUSIBLE_DOMAIN. Событийный API доступен как window.plausible.
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <html lang={locale}>
      <body className={`dm ${archivo.variable} ${inter.variable}`}>
        {plausibleDomain && (
          <>
            <Script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
            <Script id="plausible-init" strategy="afterInteractive">
              {`window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
            </Script>
          </>
        )}
        <SiteNav
          locale={locale}
          t={t}
          isLoggedIn={Boolean(authUser?.email)}
          userName={userName}
          isProvider={isProvider}
          isAdmin={isAdmin}
          unreadCount={unreadCount}
          categories={categoryOptions}
          cities={cities}
          city={city}
        />
        {children}
        <SiteFooter t={t} locale={locale} />
        <BottomNav
          isLoggedIn={Boolean(authUser?.email)}
          labels={{
            home: t.navHome,
            bookings: t.myBookings,
            favorites: t.favorites,
            messages: t.messages,
            profile: t.profile,
            search: t.findPro,
            howItWorks: t.navHowItWorks,
            login: t.login,
          }}
        />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Archivo, Inter } from "next/font/google";
import { Role } from "@prisma/client";
import "./globals.css";

// Шрифты дизайн-системы раздаются самим приложением (next/font), без запросов к Google из браузера.
const archivo = Archivo({ subsets: ["latin"], weight: ["600", "800", "900"], variable: "--font-archivo" });
const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
import { cookies, headers } from "next/headers";
import { getLocale } from "@/i18n/server";
import { categoryLabel, getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import CookieConsent from "@/components/CookieConsent";
import { getAuthUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCity } from "@/lib/city";
import { sortByCategoryOrder } from "@/components/categories";
import { getCachedCategories } from "@/lib/categories-cache";
import { IRELAND_TOWN_NAMES } from "@/lib/ireland";
import { ensureSchema } from "@/lib/ensure-schema";
import SiteNav from "@/components/SiteNav";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";
import FooterGate from "@/components/FooterGate";
import JsonLd from "@/components/JsonLd";
import PwaRegister from "@/components/PwaRegister";
import { APP_URL } from "@/lib/app-url";

const SITE_DESC = "Find local help across Ireland: chefs, cleaners, handymen and more. Post a task for free, get offers and agree directly.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Domora · Home services in Ireland", template: "%s · Domora" },
  description: SITE_DESC,
  applicationName: "Domora",
  alternates: { canonical: "/" },
  // Иконки приложения (устанавливается на телефон как PWA).
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Поведение на iPhone при запуске с рабочего стола (полноэкранный режим).
  appleWebApp: { capable: true, title: "Domora", statusBarStyle: "default" },
  // Явный тег для Safari на iPhone: без него часть версий iOS не открывает
  // установленное приложение на весь экран (Next отдаёт только новый mobile-web-app-capable).
  other: { "apple-mobile-web-app-capable": "yes" },
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

// Цвет системной строки в установленном приложении (под белую шапку Domora).
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
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
  let userAvatar: string | null = null;
  let isProvider = false;
  let isAdmin = false;
  let unreadCount = 0;
  if (authUser?.email) {
    userName = (authUser.user_metadata?.name as string | undefined) || authUser.email.split("@")[0];
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: authUser.email }, select: { id: true, name: true, avatarUrl: true, roles: true } });
      if (dbUser) {
        userName = dbUser.name;
        userAvatar = dbUser.avatarUrl;
        isProvider = dbUser.roles.includes(Role.PROVIDER);
        isAdmin = dbUser.roles.includes(Role.ADMIN);
        try {
          // На самой странице уведомлений метку гасим сразу: пользователь их
          // открыл, а фактическая отметка «прочитано» проставляется после ответа.
          const pathname = (await headers()).get("x-pathname") ?? "";
          unreadCount = pathname === "/notifications" ? 0 : await prisma.notification.count({ where: { userId: dbUser.id, readAt: null } });
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
    const cats = sortByCategoryOrder(await getCachedCategories());
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
  const tx = getExtra(locale);
  // Аналитику подключаем только с согласия пользователя (cookie_consent=all).
  const consent = (await cookies()).get("cookie_consent")?.value;

  return (
    <html lang={locale}>
      <body className={`dm ${archivo.variable} ${inter.variable}`}>
        {/* Общесайтовая микроразметка: организация и поле поиска сайта. */}
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Domora",
              url: APP_URL,
              email: "domora.irish@gmail.com",
              areaServed: "IE",
              description: SITE_DESC,
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Domora",
              url: APP_URL,
              inLanguage: locale,
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/catalog?q={search_term_string}` },
                "query-input": "required name=search_term_string",
              },
            },
          ]}
        />
        {plausibleDomain && consent === "all" && (
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
          userAvatar={userAvatar}
          isProvider={isProvider}
          isAdmin={isAdmin}
          unreadCount={unreadCount}
          categories={categoryOptions}
          cities={cities}
          city={city}
        />
        {children}
        <PwaRegister />
        <FooterGate full={<SiteFooter t={t} locale={locale} />} rights={t.footerRights} />
        <BottomNav
          isLoggedIn={Boolean(authUser?.email)}
          labels={{
            home: t.navHome,
            bookings: t.myBookings,
            favorites: t.favorites,
            messages: t.messages,
            profile: t.profile,
            post: t.navPost,
            search: t.findPro,
            howItWorks: t.navHowItWorks,
            login: t.login,
          }}
        />
        <CookieConsent text={tx.cookieBanner} accept={tx.cookieAccept} reject={tx.cookieReject} cookiesLabel={tx.navCookies} />
      </body>
    </html>
  );
}

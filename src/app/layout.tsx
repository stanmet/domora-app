import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { Role } from "@prisma/client";
import "./globals.css";

// Шрифты дизайн-системы раздаются самим приложением (next/font), без запросов к Google из браузера.
const archivo = Archivo({ subsets: ["latin"], weight: ["600", "800", "900"], variable: "--font-archivo" });
const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getAuthUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureSchema } from "@/lib/ensure-schema";
import SiteNav from "@/components/SiteNav";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Domora",
  description: "Home services in Ireland",
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
  if (authUser?.email) {
    userName = (authUser.user_metadata?.name as string | undefined) || authUser.email.split("@")[0];
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: authUser.email }, select: { name: true, roles: true } });
      if (dbUser) {
        userName = dbUser.name;
        isProvider = dbUser.roles.includes(Role.PROVIDER);
        isAdmin = dbUser.roles.includes(Role.ADMIN);
      }
    } catch {
      // База недоступна: оставляем имя из метаданных.
    }
  }

  return (
    <html lang={locale}>
      <body className={`dm ${archivo.variable} ${inter.variable}`}>
        <SiteNav
          locale={locale}
          t={t}
          isLoggedIn={Boolean(authUser?.email)}
          userName={userName}
          isProvider={isProvider}
          isAdmin={isAdmin}
        />
        {children}
        <SiteFooter t={t} locale={locale} />
        <BottomNav
          labels={{
            home: t.navHome,
            bookings: t.myBookings,
            favorites: t.favorites,
            messages: t.messages,
            profile: t.profile,
          }}
        />
      </body>
    </html>
  );
}

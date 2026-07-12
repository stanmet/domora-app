import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";

// Шрифты дизайн-системы раздаются самим приложением (next/font), без запросов к Google из браузера.
const archivo = Archivo({ subsets: ["latin"], weight: ["600", "800", "900"], variable: "--font-archivo" });
const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import LangSwitcher from "@/components/LangSwitcher";

export const metadata: Metadata = {
  title: "Domora",
  description: "Home services in Ireland",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDict(locale);

  return (
    <html lang={locale}>
      <body className={`dm ${archivo.variable} ${inter.variable}`}>
        <header>
          <div className="wrap hd">
            <Link href="/" className="logo">
              DOMO<span>RA</span>
            </Link>
            <div className="hd-right">
              <LangSwitcher locale={locale} />
              <Link href="/catalog" className="btn btn-ink btn-sm hd-cta">
                {t.findPro}
              </Link>
            </div>
          </div>
        </header>
        {children}
        <footer>
          <div
            className="wrap"
            style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, width: "100%" }}
          >
            <span>{t.footerLeft}</span>
            <span>{t.footerRight}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

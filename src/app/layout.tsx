import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Domora",
  description: "Домашние услуги в Ирландии",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

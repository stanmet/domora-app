"use client";

// Показывает большой маркетинговый футер только на витринных и информационных
// страницах (главная, каталог, профиль исполнителя, «как это работает» и т.п.).
// На рабочих экранах приложения (заказы, сообщения, оплата, кабинеты, вход)
// футер лишний и только мешает - там его прячем.
import { usePathname } from "next/navigation";

// Префиксы служебных/рабочих разделов, где футер не нужен.
const HIDE_PREFIXES = [
  "/login",
  "/signup",
  "/reset-password",
  "/bookings",
  "/messages",
  "/favorites",
  "/profile",
  "/notifications",
  "/subscriptions",
  "/admin",
  "/pro",
  "/tasks/mine",
  "/tasks/new",
];

function shouldHide(pathname: string): boolean {
  // Экраны оформления/оплаты брони (например /providers/<id>/book).
  if (pathname.endsWith("/book") || pathname.endsWith("/pay")) return true;
  return HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (shouldHide(pathname)) return null;
  return <>{children}</>;
}

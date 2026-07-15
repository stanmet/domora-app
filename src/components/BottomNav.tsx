"use client";

// Нижняя панель навигации (таб-бар) в стиле мобильного приложения: Главная,
// Заказы, Избранное, Сообщения, Профиль. Видна только на телефоне/планшете,
// активная вкладка подсвечивается по текущему адресу.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Heart, Home, HelpCircle, LogIn, MessageCircle, Search, UserRound, type LucideIcon } from "lucide-react";

export type BottomNavLabels = {
  home: string;
  bookings: string;
  favorites: string;
  messages: string;
  profile: string;
  search: string;
  howItWorks: string;
  login: string;
};

export default function BottomNav({ labels, isLoggedIn }: { labels: BottomNavLabels; isLoggedIn: boolean }) {
  const path = usePathname() || "/";

  // Гостю не показываем «закрытые» вкладки (заказы/сообщения ведут на вход):
  // вместо тупиков даём полезные пункты и явный вход.
  const items: { href: string; label: string; icon: LucideIcon; active: boolean }[] = isLoggedIn
    ? [
        { href: "/", label: labels.home, icon: Home, active: path === "/" },
        { href: "/bookings", label: labels.bookings, icon: ClipboardList, active: path.startsWith("/bookings") },
        { href: "/favorites", label: labels.favorites, icon: Heart, active: path.startsWith("/favorites") },
        { href: "/messages", label: labels.messages, icon: MessageCircle, active: path.startsWith("/messages") },
        { href: "/account", label: labels.profile, icon: UserRound, active: path.startsWith("/account") },
      ]
    : [
        { href: "/", label: labels.home, icon: Home, active: path === "/" },
        { href: "/catalog", label: labels.search, icon: Search, active: path.startsWith("/catalog") },
        { href: "/how-it-works", label: labels.howItWorks, icon: HelpCircle, active: path.startsWith("/how-it-works") },
        { href: "/login", label: labels.login, icon: LogIn, active: path.startsWith("/login") },
      ];

  return (
    <nav className="botnav" aria-label={labels.home}>
      <div className="botnav-row">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} className={"botnav-item" + (it.active ? " on" : "")}>
              <Icon size={21} strokeWidth={it.active ? 2.4 : 1.9} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

// Нижняя панель навигации (таб-бар) в стиле мобильного приложения: Главная,
// Заказы, Избранное, Сообщения, Профиль. Видна только на телефоне/планшете,
// активная вкладка подсвечивается по текущему адресу.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Heart, Home, MessageCircle, UserRound, type LucideIcon } from "lucide-react";

export type BottomNavLabels = {
  home: string;
  bookings: string;
  favorites: string;
  messages: string;
  profile: string;
};

export default function BottomNav({ labels }: { labels: BottomNavLabels }) {
  const path = usePathname() || "/";

  const items: { href: string; label: string; icon: LucideIcon; active: boolean }[] = [
    { href: "/", label: labels.home, icon: Home, active: path === "/" },
    { href: "/bookings", label: labels.bookings, icon: ClipboardList, active: path.startsWith("/bookings") },
    { href: "/favorites", label: labels.favorites, icon: Heart, active: path.startsWith("/favorites") },
    { href: "/messages", label: labels.messages, icon: MessageCircle, active: path.startsWith("/messages") },
    { href: "/account", label: labels.profile, icon: UserRound, active: path.startsWith("/account") },
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

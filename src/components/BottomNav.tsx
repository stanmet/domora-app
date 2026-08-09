"use client";

// Нижняя панель навигации (таб-бар) в стиле мобильного приложения: Главная,
// Заказы, крупная центральная кнопка "Разместить задачу", Сообщения, Профиль.
// Видна только на телефоне/планшете, активная вкладка подсвечивается по текущему
// адресу. Один набор иконок для всех: гость по «закрытым» вкладкам попадает на
// вход. Избранное вынесено в боковое меню (бургер), как на утверждённом макете.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, MessageCircle, Plus, UserRound, type LucideIcon } from "lucide-react";

export type BottomNavLabels = {
  home: string;
  bookings: string;
  favorites: string;
  messages: string;
  profile: string;
  post: string;
  search: string;
  howItWorks: string;
  login: string;
};

export default function BottomNav({ labels }: { labels: BottomNavLabels; isLoggedIn?: boolean }) {
  const path = usePathname() || "/";

  // Слева от центральной кнопки и справа - по два обычных пункта.
  const left: { href: string; label: string; icon: LucideIcon; active: boolean }[] = [
    { href: "/", label: labels.home, icon: Home, active: path === "/" },
    { href: "/bookings", label: labels.bookings, icon: ClipboardList, active: path.startsWith("/bookings") },
  ];
  const right: { href: string; label: string; icon: LucideIcon; active: boolean }[] = [
    { href: "/messages", label: labels.messages, icon: MessageCircle, active: path.startsWith("/messages") },
    { href: "/account", label: labels.profile, icon: UserRound, active: path.startsWith("/account") },
  ];
  const postActive = path.startsWith("/tasks/new");

  return (
    <nav className="botnav" aria-label={labels.home}>
      <div className="botnav-row">
        {left.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} className={"botnav-item" + (it.active ? " on" : "")}>
              <Icon size={21} strokeWidth={it.active ? 2.4 : 1.9} />
              <span>{it.label}</span>
            </Link>
          );
        })}

        {/* Центральная акцентная кнопка: разместить задачу */}
        <Link href="/tasks/new" className={"botnav-post" + (postActive ? " on" : "")}>
          <span className="botnav-post-btn">
            <Plus size={24} strokeWidth={2.6} />
          </span>
          <span>{labels.post}</span>
        </Link>

        {right.map((it) => {
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

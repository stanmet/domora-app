"use client";

// Единая шапка Domora: логотип, строка поиска "Что нужно сделать?" и бургер.
// Бургер открывает боковое меню (drawer) с разделами, ролью пользователя,
// переключателем языка и ссылками "Стать исполнителем" / "Кабинет исполнителя".
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type { Dict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import LangSwitcher from "./LangSwitcher";
import SignOutButton from "./SignOutButton";

export default function SiteNav({
  locale,
  t,
  isLoggedIn,
  userName,
  isProvider,
  isAdmin,
}: {
  locale: Locale;
  t: Dict;
  isLoggedIn: boolean;
  userName: string | null;
  isProvider: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Закрытие по Escape и блокировка прокрутки под открытым меню.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
    close();
    router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog");
  };

  const roleLabel = isProvider ? t.rolePro : t.roleClient;

  const mainLinks: { href: string; label: string; icon: typeof Heart; auth?: boolean }[] = [
    { href: "/", label: t.navHome, icon: LayoutGrid },
    { href: "/services", label: t.navServices, icon: Search },
    { href: "/bookings", label: t.myBookings, icon: ClipboardList, auth: true },
    { href: "/tasks/mine", label: t.myTasks, icon: ListTodo, auth: true },
    { href: "/favorites", label: t.favorites, icon: Heart, auth: true },
    { href: "/messages", label: t.messages, icon: MessageCircle, auth: true },
    { href: "/account", label: t.profile, icon: UserRound, auth: true },
    { href: "/how-it-works", label: t.navHowItWorks, icon: HelpCircle },
    { href: "/safety", label: t.navSafety, icon: ShieldCheck },
  ];

  return (
    <>
      <header>
        <div className="wrap hd">
          <Link href="/" className="logo" onClick={close}>
            DOMO<span>RA</span>
          </Link>

          <form className="topsearch" onSubmit={onSearch} role="search">
            <Search size={16} />
            <input name="q" type="search" placeholder={t.searchTop} aria-label={t.searchTop} />
          </form>

          <button className="burger" onClick={() => setOpen(true)} aria-label={t.menu} aria-expanded={open}>
            <Menu size={20} />
          </button>
        </div>
      </header>

      {open && <div className="drawer-backdrop" onClick={close} />}

      <aside className={"drawer" + (open ? " open" : "")} aria-hidden={!open}>
        <div className="drawer-top">
          <span className="logo">
            DOMO<span>RA</span>
          </span>
          <button className="burger" onClick={close} aria-label={t.close}>
            <X size={20} />
          </button>
        </div>

        {/* Главные действия: под логотипом, над именем пользователя */}
        <div className="drawer-cta">
          <Link href="/tasks/new" className="btn btn-green" onClick={close}>
            {t.postTask} <ArrowRight size={16} />
          </Link>
          <Link href="/catalog" className="btn btn-ink" onClick={close}>
            {t.findPro} <ArrowRight size={16} />
          </Link>
          {!isProvider && (
            <Link href="/signup?role=pro" className="btn btn-ghost" onClick={close}>
              {t.becomePro}
            </Link>
          )}
        </div>

        {isLoggedIn ? (
          <Link href="/account" className="drawer-user" onClick={close}>
            <span className="avatar">{(userName ?? "?")[0]?.toUpperCase()}</span>
            <span>
              <b>{userName}</b>
              <span className="drawer-role">{roleLabel}</span>
            </span>
          </Link>
        ) : (
          <div className="drawer-auth">
            <Link href="/login" className="btn btn-ink btn-sm" onClick={close}>
              {t.login}
            </Link>
            <Link href="/signup" className="btn btn-line btn-sm" onClick={close}>
              {t.signup}
            </Link>
          </div>
        )}

        <nav className="drawer-nav">
          {mainLinks
            .filter((l) => !l.auth || isLoggedIn)
            .map((l) => {
              const Icon = l.icon;
              return (
                <Link key={l.href} href={l.href} className="drawer-link" onClick={close}>
                  <Icon size={18} /> {l.label}
                </Link>
              );
            })}
        </nav>

        {(isProvider || isAdmin) && (
          <>
            <div className="drawer-sep" />
            <nav className="drawer-nav">
              {isProvider && (
                <Link href="/pro" className="drawer-link accent" onClick={close}>
                  <LayoutDashboard size={18} /> {t.proDash}
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="drawer-link" onClick={close}>
                  <ShieldCheck size={18} /> {t.adminPanel}
                </Link>
              )}
            </nav>
          </>
        )}

        <div className="drawer-foot">
          <LangSwitcher locale={locale} />
          {isLoggedIn && <SignOutButton label={t.logout} />}
        </div>
      </aside>
    </>
  );
}

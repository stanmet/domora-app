"use client";

// Подвал есть на всех страницах, но в двух видах:
// - на главной ("/") показываем полный маркетинговый футер (колонки ссылок,
//   категории, контакты) - его передают в проп full;
// - на всех остальных страницах показываем короткий футер: логотип и строка
//   копирайта, где слоган ("Сервис для дома в Ирландии") идёт одной строкой.
import { usePathname } from "next/navigation";

export default function FooterGate({ full, rights }: { full: React.ReactNode; rights: string }) {
  const pathname = usePathname();
  if (pathname === "/") return <>{full}</>;

  // Разбиваем "© 2012-2026 Domora. Сервис для дома в Ирландии." на копирайт и
  // слоган по первому ". ", чтобы слоган держать в одной строке.
  const sep = rights.indexOf(". ");
  const head = sep === -1 ? rights : rights.slice(0, sep + 1);
  const tail = sep === -1 ? "" : rights.slice(sep + 2);

  return (
    <footer className="site-footer site-footer-mini">
      <div className="wrap foot-mini">
        <span className="logo">
          DOMO<span>RA</span>
        </span>
        <p>
          {head} {tail && <span className="foot-nowrap">{tail}</span>}
        </p>
      </div>
    </footer>
  );
}

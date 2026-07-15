// Страница 404 с человеческим текстом и ссылками на главные разделы (Kabanchik).
import Link from "next/link";
import { ArrowRight, Home, Search } from "lucide-react";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";

export default async function NotFound() {
  const locale = await getLocale();
  const t = getDict(locale);

  return (
    <main className="wrap sec" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
      <div className="display" style={{ fontSize: "clamp(56px,18vw,120px)", color: "var(--orange)", lineHeight: 1 }}>
        404
      </div>
      <h1 className="page" style={{ marginTop: 8 }}>{t.nfTitle}</h1>
      <p className="sub">{t.nfText}</p>
      <div className="cta" style={{ justifyContent: "center", marginTop: 8 }}>
        <Link href="/" className="btn btn-ink">
          <Home size={16} /> {t.goHome}
        </Link>
        <Link href="/catalog" className="btn btn-ghost">
          <Search size={16} /> {t.findPro} <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}

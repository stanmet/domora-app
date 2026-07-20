"use client";

// Баннер согласия на cookie/аналитику. Показывается, пока выбор не сделан.
// "Принять" включает аналитику (перезагрузка, чтобы подгрузить счётчик);
// "Только необходимые" оставляет лишь технические cookie.
import { useEffect, useState } from "react";
import Link from "next/link";

const COOKIE = "cookie_consent";

function hasChoice(): boolean {
  return typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith(COOKIE + "="));
}

export default function CookieConsent({
  text,
  accept,
  reject,
  cookiesLabel,
}: {
  text: string;
  accept: string;
  reject: string;
  cookiesLabel: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasChoice()) setShow(true);
  }, []);

  const choose = (value: "all" | "essential") => {
    document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    setShow(false);
    // При согласии на аналитику перезагружаем, чтобы подключить счётчик.
    if (value === "all") window.location.reload();
  };

  if (!show) return null;

  return (
    <div className="cookiebar" role="dialog" aria-label="Cookies" style={{
      position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 60, maxWidth: 720, margin: "0 auto",
      background: "var(--ink, #14201a)", color: "#fff", borderRadius: 14, padding: "14px 16px",
      display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", boxShadow: "0 8px 30px rgba(0,0,0,.25)",
    }}>
      <p style={{ margin: 0, flex: 1, minWidth: 220, fontSize: 13.5, lineHeight: 1.5 }}>
        {text} <Link href="/cookies" style={{ color: "#8fd6ad", textDecoration: "underline" }}>{cookiesLabel}</Link>
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-sm" style={{ background: "#fff", color: "#14201a" }} onClick={() => choose("all")}>
          {accept}
        </button>
        <button className="btn btn-sm" style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.35)" }} onClick={() => choose("essential")}>
          {reject}
        </button>
      </div>
    </div>
  );
}

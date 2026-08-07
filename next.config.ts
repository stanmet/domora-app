import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Загрузка фото идёт через серверные действия (portfolio, услуги, аватар,
    // фото задачи, чат). По умолчанию Next режет тело запроса на 1 МБ, из-за чего
    // любая реальная фотография (2-6 МБ) падала с ошибкой ещё до сохранения.
    // Поднимаем лимит с запасом на несколько файлов (лимит на один файл - 6 МБ).
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // «Мои задачи» объединены с «Мои заказы»: старый адрес ведём на новый раздел.
  async redirects() {
    return [{ source: "/tasks/mine", destination: "/bookings?tab=active", permanent: false }];
  },
  // Заголовки безопасности браузера для всех страниц. Не трогают загрузку
  // ресурсов (Stripe.js, Supabase, Plausible работают как раньше): защищают от
  // встраивания сайта в чужие страницы (кликджекинг), подмены типов контента и
  // утечки реферера. CSP ограничен frame-ancestors, чтобы ничего не сломать.
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

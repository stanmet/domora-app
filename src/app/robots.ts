// robots.txt: открываем публичные страницы, закрываем личные разделы.
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/bookings",
        "/pro",
        "/messages",
        "/notifications",
        "/disputes",
        "/reset-password",
        "/forgot-password",
      ],
    },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}

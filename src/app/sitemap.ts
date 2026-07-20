// Карта сайта: публичные статические страницы, категории, города (для SEO),
// профили активных исполнителей.
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { IRELAND_TOWN_NAMES } from "@/lib/ireland";

export const dynamic = "force-dynamic";

const TOP_CITIES = ["Dublin", "Cork", "Galway", "Limerick", "Waterford"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "";
  const now = new Date();

  const staticPaths = ["", "/catalog", "/services", "/tasks", "/how-it-works", "/safety", "/terms", "/privacy", "/cookies", "/top-performers"];
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.6,
  }));

  // Города: страница каталога с фильтром по городу.
  for (const town of IRELAND_TOWN_NAMES) {
    entries.push({
      url: `${base}/catalog?city=${encodeURIComponent(town)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  // Категории и связки категория+топ-город: главные посадочные страницы для SEO.
  try {
    const cats = await prisma.category.findMany({ select: { slug: true } });
    for (const c of cats) {
      entries.push({
        url: `${base}/catalog?cat=${c.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
      for (const town of TOP_CITIES) {
        entries.push({
          url: `${base}/catalog?cat=${c.slug}&city=${encodeURIComponent(town)}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }
  } catch {
    // База недоступна: пропускаем категории.
  }

  try {
    const pros = await prisma.providerProfile.findMany({
      where: { status: "ACTIVE", user: { isTest: false } },
      select: { userId: true },
      take: 5000,
    });
    for (const p of pros) {
      entries.push({
        url: `${base}/providers/${p.userId}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // База недоступна: отдаём хотя бы статические страницы.
  }

  return entries;
}

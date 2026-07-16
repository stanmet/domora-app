// Карта сайта: публичные статические страницы + профили активных исполнителей.
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "";
  const now = new Date();

  const staticPaths = ["", "/catalog", "/tasks", "/how-it-works", "/safety", "/terms", "/taxes", "/top-performers"];
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.6,
  }));

  try {
    const pros = await prisma.providerProfile.findMany({
      where: { status: "ACTIVE" },
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

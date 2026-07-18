// ТОП исполнителей: активные исполнители с самым высоким рейтингом (в духе
// /top-performers Kabanchik). Карточки в стиле каталога.
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n/server";
import { getDict, unitLabel } from "@/i18n/dictionaries";
import { eur } from "@/lib/format";
import { isDemoMode } from "@/lib/test-users/bots";

export const dynamic = "force-dynamic";

export default async function TopPerformersPage() {
  const locale = await getLocale();
  const t = getDict(locale);

  // Демо-режим: показываем тестовых (ботовских) исполнителей в топе.
  const demo = await isDemoMode();

  const providers = await prisma.providerProfile.findMany({
    where: { status: "ACTIVE", user: demo ? {} : { isTest: false } },
    orderBy: [{ ratingCached: "desc" }, { jobsCount: "desc" }],
    take: 20,
    include: {
      listings: { where: { status: "ACTIVE" }, orderBy: { priceCents: "asc" }, take: 1 },
    },
  });

  return (
    <main className="wrap sec">
      <h1 className="page">{t.topTitle}</h1>
      <p className="sub">{t.topSub}</p>

      {providers.length === 0 ? (
        <div className="empty">{t.noResults}</div>
      ) : (
        <div className="grid">
          {providers.map((p, i) => {
            const rating = Number(p.ratingCached);
            const cheapest = p.listings[0];
            const cover = p.portfolioPhotos[0] ?? cheapest?.photos[0];
            return (
              <Link href={`/providers/${p.userId}`} className="pcard2" key={p.userId}>
                <div className="photo" style={{ background: "var(--sage)" }}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={p.displayName} />
                  ) : (
                    <div className="avatar big" style={{ background: "transparent" }}>
                      {p.displayName[0]}
                    </div>
                  )}
                  <span className="toprank">#{i + 1}</span>
                </div>
                <div className="t">{p.displayName}</div>
                <div className="m">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <MapPin size={12} /> {p.city}
                  </span>
                  {p.jobsCount > 0 && rating > 0 ? (
                    <span className="rate">
                      <Star size={12} fill="currentColor" /> {rating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="tag">{t.newPro}</span>
                  )}
                </div>
                {cheapest && cheapest.priceCents > 0 && cheapest.unit !== "FIXED_QUOTE" && (
                  <div className="pr">
                    {t.fromCap} <b>{eur(cheapest.priceCents, locale)}</b> / {unitLabel(t, cheapest.unit)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

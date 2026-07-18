// Избранные исполнители клиента. Карточки в стиле каталога.
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict, unitLabel } from "@/i18n/dictionaries";
import { eur } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/favorites");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  const favs = await prisma.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const providers = await prisma.providerProfile.findMany({
    where: { userId: { in: favs.map((f) => f.providerId) }, status: "ACTIVE", user: { isTest: false } },
    include: {
      listings: { where: { status: "ACTIVE" }, orderBy: { priceCents: "asc" }, take: 1 },
    },
  });
  // Сохраняем порядок избранного (от последнего добавленного).
  const order = new Map(favs.map((f, i) => [f.providerId, i]));
  providers.sort((a, b) => (order.get(a.userId)! - order.get(b.userId)!));

  return (
    <main className="wrap sec">
      <h1 className="page">{t.favorites}</h1>
      <p className="sub">{t.favoritesSub}</p>

      {providers.length === 0 ? (
        <div className="empty">{t.favoritesEmpty}</div>
      ) : (
        <div className="grid">
          {providers.map((p) => {
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

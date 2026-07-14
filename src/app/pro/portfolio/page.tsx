// Портфолио исполнителя: галерея работ профиля (до 20 фото) и фото по каждой
// услуге (до 10). Фото показываются в каталоге и на странице услуги/профиля.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { MAX_LISTING_PHOTOS, MAX_PORTFOLIO_PHOTOS, storageConfigured } from "@/lib/storage";
import PortfolioUploader, { type UploaderLabels } from "@/components/PortfolioUploader";
import { addListingPhotos, addPortfolioPhotos, removeListingPhoto, removePortfolioPhoto } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/portfolio");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { portfolioPhotos: true },
  });
  const listings = await prisma.listing.findMany({
    where: { providerId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, professionLabel: true, photos: true },
  });

  const labels: UploaderLabels = { add: t.pfAdd, remove: t.pfRemove, full: t.pfFull, hint: t.pfHint };

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 680, paddingBottom: 64 }}>
        <Link href="/pro" className="back">
          <ArrowLeft size={14} /> {t.proDash}
        </Link>
        <h1 className="page">{t.portfolioTitle}</h1>
        <p className="sub">{t.portfolioSub}</p>

        {!storageConfigured() && <div className="err">{t.pfStorageOff}</div>}

        <div className="card">
          <h3 style={{ fontFamily: "var(--font-archivo)", fontWeight: 800, textTransform: "uppercase", fontSize: 16, marginBottom: 4 }}>
            {t.pfProfileTitle}
          </h3>
          <p className="sub" style={{ marginBottom: 0 }}>{t.pfProfileSub}</p>
          <PortfolioUploader
            photos={profile?.portfolioPhotos ?? []}
            max={MAX_PORTFOLIO_PHOTOS}
            addAction={addPortfolioPhotos}
            removeAction={removePortfolioPhoto}
            labels={labels}
          />
        </div>

        {listings.length === 0 ? (
          <div className="empty">{t.svcEmpty}</div>
        ) : (
          listings.map((l) => (
            <div className="card" key={l.id}>
              <h3 style={{ fontFamily: "var(--font-archivo)", fontWeight: 800, textTransform: "uppercase", fontSize: 15, marginBottom: 4 }}>
                {l.professionLabel ? `${l.professionLabel} · ${l.title}` : l.title}
              </h3>
              <PortfolioUploader
                photos={l.photos}
                max={MAX_LISTING_PHOTOS}
                addAction={addListingPhotos.bind(null, l.id)}
                removeAction={removeListingPhoto.bind(null, l.id)}
                labels={labels}
              />
            </div>
          ))
        )}
      </div>
    </main>
  );
}

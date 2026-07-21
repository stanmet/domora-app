// Страница профиля исполнителя: имя, профессия, город, «о себе», радиус выезда.
// Заполняет то, что раньше оставалось дефолтным (город Dublin, пустое bio).
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProProfilePage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/profile");

  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: {
      displayName: true,
      customProfession: true,
      city: true,
      bio: true,
      travelRadiusKm: true,
      legalName: true,
      businessAddress: true,
      vatNumber: true,
    },
  });

  const values = {
    displayName: profile?.displayName ?? user.name,
    customProfession: profile?.customProfession ?? "",
    city: profile?.city ?? user.city ?? "",
    bio: profile?.bio ?? "",
    travelRadiusKm: profile?.travelRadiusKm ?? 20,
    legalName: profile?.legalName ?? "",
    businessAddress: profile?.businessAddress ?? "",
    vatNumber: profile?.vatNumber ?? "",
  };

  const taxLabels = {
    legalName: tx.ppLegalName,
    businessAddress: tx.ppBusinessAddress,
    vatNumber: tx.ppVatNumber,
    hint: tx.ppTaxHint,
  };

  return (
    <main className="wrap sec" style={{ maxWidth: 620 }}>
      <Link href="/pro" className="backlink">
        <ArrowLeft size={16} /> {t.proDash}
      </Link>
      <h1 className="page">{t.proProfile}</h1>
      <p className="sub">{t.proProfileSub}</p>
      <ProfileForm t={t} values={values} tax={taxLabels} />
    </main>
  );
}

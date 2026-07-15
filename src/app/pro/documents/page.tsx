// Документы и верификация исполнителя: загрузка сертификатов, дипломов,
// разрешений и лицензий (RECI/RGII). Файлы в Supabase Storage.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { storageConfigured } from "@/lib/storage";
import DocumentsManager, { type DocRow } from "./DocumentsManager";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/pro/documents");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);
  if (!user.roles.includes(Role.PROVIDER)) redirect("/account");

  let docs: DocRow[] = [];
  try {
    docs = await prisma.providerDocument.findMany({
      where: { providerId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, label: true },
    });
  } catch {
    // Таблица ещё не создана: покажем пустой список.
  }

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 680, paddingBottom: 64 }}>
        <Link href="/pro" className="back">
          <ArrowLeft size={14} /> {t.proDash}
        </Link>
        <h1 className="page">{t.docsTitle}</h1>
        <p className="sub">{t.docsSub}</p>

        {!storageConfigured() && <div className="err">{t.pfStorageOff}</div>}

        <div className="card">
          <DocumentsManager docs={docs} t={t} />
          <p className="fieldhint" style={{ marginTop: 12 }}>{t.docsHint}</p>
        </div>
      </div>
    </main>
  );
}

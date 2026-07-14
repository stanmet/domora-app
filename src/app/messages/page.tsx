// Список переписок пользователя (по бронированиям, где он клиент или исполнитель).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { translateBatch } from "@/lib/translate";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login?next=/messages");
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  const threads = await prisma.thread.findMany({
    where: { booking: { OR: [{ clientId: user.id }, { providerId: user.id }] } },
    include: {
      booking: {
        select: {
          clientId: true,
          client: { select: { name: true } },
          provider: { select: { displayName: true } },
          listing: { select: { title: true } },
        },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Сортировка по времени последнего сообщения (свежие сверху).
  threads.sort((a, b) => {
    const ta = a.messages[0]?.createdAt.getTime() ?? 0;
    const tb = b.messages[0]?.createdAt.getTime() ?? 0;
    return tb - ta;
  });

  const previews = await translateBatch(
    threads.map((th) => th.messages[0]?.textOriginal ?? "").filter(Boolean),
    locale,
  );

  return (
    <main className="wrap sec">
      <h1 className="page">{t.messages}</h1>
      <p className="sub">{t.messagesSub}</p>

      {threads.length === 0 ? (
        <div className="empty">{t.messagesEmpty}</div>
      ) : (
        threads.map((th) => {
          if (!th.booking) return null;
          const iAmClient = th.booking.clientId === user.id;
          const name = iAmClient ? th.booking.provider.displayName : th.booking.client.name;
          const last = th.messages[0]?.textOriginal ?? "";
          const preview = last ? previews.get(last.trim())?.text ?? last : th.booking.listing.title;
          return (
            <Link href={`/messages/${th.id}`} className="convo" key={th.id}>
              <span className="avatar">{name[0]?.toUpperCase()}</span>
              <span className="cmain">
                <span className="cname">{name}</span>
                <span className="cprev">{preview}</span>
              </span>
            </Link>
          );
        })
      )}
    </main>
  );
}

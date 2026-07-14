// Переписка по брони: сообщения на языке читателя с пометкой автоперевода
// и форма отправки. Участники - клиент и исполнитель этой брони.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { langName } from "@/i18n/config";
import { translateBatch } from "@/lib/translate";
import TranslatableText, { type TrLabels } from "@/components/TranslatableText";
import ChatForm from "../ChatForm";
import { sendMessage } from "../actions";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/messages/${id}`);
  const locale = await getLocale();
  const t = getDict(locale);
  const trLabels: TrLabels = { from: t.translatedFrom, showOriginal: t.showOriginal, showTranslation: t.showTranslation };
  const user = await ensureDbUser(authUser, locale);

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      booking: {
        select: {
          clientId: true,
          providerId: true,
          client: { select: { name: true } },
          provider: { select: { displayName: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true } } } },
    },
  });
  if (!thread?.booking) notFound();
  if (user.id !== thread.booking.clientId && user.id !== thread.booking.providerId) notFound();

  const iAmClient = thread.booking.clientId === user.id;
  const counterpart = iAmClient ? thread.booking.provider.displayName : thread.booking.client.name;

  const tr = await translateBatch(thread.messages.map((m) => m.textOriginal), locale);
  const trOf = (s: string) => tr.get(s.trim()) ?? { text: s, sourceLang: locale, translated: false };

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 640, paddingBottom: 24 }}>
        <Link href="/messages" className="back">
          <ArrowLeft size={14} /> {t.messages}
        </Link>
        <h1 className="page" style={{ fontSize: "clamp(20px,5vw,26px)" }}>{counterpart}</h1>

        <div className="chat">
          {thread.messages.map((m) => {
            const mine = m.author.id === user.id;
            const mt = trOf(m.textOriginal);
            return (
              <div className={"msg " + (mine ? "me" : "them")} key={m.id}>
                <TranslatableText
                  as="div"
                  display={mt.text}
                  original={m.textOriginal}
                  translated={mt.translated}
                  sourceLangName={langName(mt.sourceLang)}
                  labels={trLabels}
                />
              </div>
            );
          })}
        </div>

        <ChatForm action={sendMessage.bind(null, thread.id)} placeholder={t.msgWritePh} sendLabel={t.msgSend} />
      </div>
    </main>
  );
}

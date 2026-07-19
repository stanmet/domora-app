// Переписка по брони: сообщения на языке читателя с пометкой автоперевода
// и форма отправки. Участники - клиент и исполнитель этой брони.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Ban } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { getExtra } from "@/i18n/extra";
import { langName } from "@/i18n/config";
import { translateBatch } from "@/lib/translate";
import TranslatableText, { type TrLabels } from "@/components/TranslatableText";
import ChatForm from "../ChatForm";
import { sendMessage, blockUser, unblockUser } from "../actions";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/messages/${id}`);
  const locale = await getLocale();
  const t = getDict(locale);
  const tx = getExtra(locale);
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

  // Открыл переписку - помечаем сообщения собеседника прочитанными.
  await prisma.message
    .updateMany({ where: { threadId: id, authorId: { not: user.id }, readAt: null }, data: { readAt: new Date() } })
    .catch(() => 0);

  // "Прочитано" показываем под последним моим сообщением, которое собеседник прочёл.
  const lastReadMineId = [...thread.messages].reverse().find((m) => m.author.id === user.id && m.readAt)?.id ?? null;

  // Блокировка: состояние в обе стороны. Собеседник - вторая сторона брони.
  const otherId = iAmClient ? thread.booking.providerId : thread.booking.clientId;
  const blocks = await prisma.chatBlock
    .findMany({
      where: { OR: [{ blockerId: user.id, blockedId: otherId }, { blockerId: otherId, blockedId: user.id }] },
      select: { blockerId: true },
    })
    .catch(() => [] as { blockerId: string }[]);
  const iBlocked = blocks.some((b) => b.blockerId === user.id);
  const blockedByThem = blocks.some((b) => b.blockerId === otherId);
  const chatDisabled = iBlocked || blockedByThem;

  const tr = await translateBatch(thread.messages.map((m) => m.textOriginal), locale);
  const trOf = (s: string) => tr.get(s.trim()) ?? { text: s, sourceLang: locale, translated: false };

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 640, paddingBottom: 24 }}>
        <Link href="/messages" className="back">
          <ArrowLeft size={14} /> {t.messages}
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <h1 className="page" style={{ fontSize: "clamp(20px,5vw,26px)", margin: 0 }}>{counterpart}</h1>
          {iBlocked ? (
            <form action={unblockUser.bind(null, thread.id)}>
              <button className="btn btn-line btn-sm">{tx.chatUnblock}</button>
            </form>
          ) : (
            <form action={blockUser.bind(null, thread.id)}>
              <button className="btn btn-line btn-sm">
                <Ban size={14} /> {tx.chatBlock}
              </button>
            </form>
          )}
        </div>

        <div className="chat">
          {thread.messages.map((m) => {
            const mine = m.author.id === user.id;
            const mt = trOf(m.textOriginal);
            return (
              <div className={"msg " + (mine ? "me" : "them")} key={m.id}>
                {m.textOriginal && (
                  <TranslatableText
                    as="div"
                    display={mt.text}
                    original={m.textOriginal}
                    translated={mt.translated}
                    sourceLangName={langName(mt.sourceLang)}
                    labels={trLabels}
                  />
                )}
                {m.attachments.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt=""
                      style={{ maxWidth: "100%", borderRadius: 10, marginTop: m.textOriginal ? 6 : 0, display: "block" }}
                    />
                  </a>
                ))}
                {m.id === lastReadMineId && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, textAlign: "right" }}>{tx.chatRead}</div>
                )}
              </div>
            );
          })}
        </div>

        {chatDisabled ? (
          <div className="hold" style={{ marginTop: 12 }}>
            <Ban size={15} /> {tx.chatBlocked}
          </div>
        ) : (
          <ChatForm
            action={sendMessage.bind(null, thread.id)}
            placeholder={t.msgWritePh}
            sendLabel={t.msgSend}
            attachLabel={tx.chatAttach}
          />
        )}
      </div>
    </main>
  );
}

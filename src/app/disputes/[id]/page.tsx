// Центр спора: обе стороны видят дело, этап "договоритесь сами" (возврат 20/50%),
// принятие в один клик, передача в поддержку и переписка по делу.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { DisputeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/user";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n/dictionaries";
import { eur } from "@/lib/format";
import ChatForm from "../../messages/ChatForm";
import { acceptResolution, escalateDispute, postDisputeMessage, proposeResolution } from "../actions";

export const dynamic = "force-dynamic";

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect(`/login?next=/disputes/${id}`);
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await ensureDbUser(authUser, locale);

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      booking: {
        select: { id: true, clientId: true, providerId: true, totalCents: true, listing: { select: { title: true } } },
      },
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, authorId: true, text: true } },
    },
  });
  if (!dispute?.booking) notFound();
  const isClient = dispute.booking.clientId === user.id;
  const isProvider = dispute.booking.providerId === user.id;
  if (!isClient && !isProvider) notFound();

  const statusText =
    dispute.status === DisputeStatus.RESOLVED
      ? t.dsStatusRes
      : dispute.status === DisputeStatus.ARBITRATION
        ? t.dsStatusArb
        : t.dsStatusNeg;
  const statusClass =
    dispute.status === DisputeStatus.RESOLVED ? "done" : dispute.status === DisputeStatus.ARBITRATION ? "req" : "dec";

  const offerCents = dispute.resolutionCents ?? 0;

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 640, paddingBottom: 40 }}>
        <Link href={isProvider ? "/pro/bookings" : "/bookings"} className="back">
          <ArrowLeft size={14} /> {t.back}
        </Link>
        <div className="taskhead" style={{ marginTop: 8 }}>
          <span className="tasktag">
            <ShieldAlert size={13} /> {t.dsTitle}
          </span>
          <span className={"pill " + statusClass}>{statusText}</span>
        </div>
        <h1 className="page" style={{ fontSize: "clamp(20px,5vw,26px)" }}>{dispute.booking.listing.title}</h1>
        <p className="sub">
          {t.sumTotal}: {eur(dispute.booking.totalCents, locale)}
        </p>

        {dispute.status === DisputeStatus.NEGOTIATION && (
          <div className="card" style={{ marginTop: 8 }}>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 12px" }}>{t.dsHint}</p>

            {isProvider && (
              <div className="bkbtns">
                <form action={proposeResolution.bind(null, dispute.id, "refund20")}>
                  <button className="btn btn-line btn-sm">
                    {t.dsRefund20} · {eur(Math.round(dispute.booking.totalCents * 0.2), locale)}
                  </button>
                </form>
                <form action={proposeResolution.bind(null, dispute.id, "refund50")}>
                  <button className="btn btn-line btn-sm">
                    {t.dsRefund50} · {eur(Math.round(dispute.booking.totalCents * 0.5), locale)}
                  </button>
                </form>
              </div>
            )}

            {isClient && offerCents > 0 && (
              <div className="offer-sent" style={{ marginBottom: 10 }}>
                {t.dsClientOffered}: <b>{eur(offerCents, locale)}</b>
                <form action={acceptResolution.bind(null, dispute.id)} style={{ marginTop: 8 }}>
                  <button className="btn btn-green btn-sm">{t.dsAccept}</button>
                </form>
              </div>
            )}

            <form action={escalateDispute.bind(null, dispute.id)} style={{ marginTop: 10 }}>
              <button className="btn btn-red btn-sm">{t.dsEscalate}</button>
            </form>
          </div>
        )}

        {dispute.status === DisputeStatus.ARBITRATION && (
          <div className="hold" style={{ marginTop: 12 }}>
            <ShieldAlert size={15} /> {t.dsArbitration}
          </div>
        )}
        {dispute.status === DisputeStatus.RESOLVED && (
          <div className="offer-sent" style={{ marginTop: 12 }}>{t.dsResolvedMsg}</div>
        )}

        <div className="chat" style={{ marginTop: 18 }}>
          {dispute.messages.map((m) => (
            <div className={"msg " + (m.authorId === user.id ? "me" : "them")} key={m.id}>
              {m.text}
            </div>
          ))}
        </div>
        <ChatForm action={postDisputeMessage.bind(null, dispute.id)} placeholder={t.dsMsgPh} sendLabel={t.dsSend} />
      </div>
    </main>
  );
}

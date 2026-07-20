// GET /api/account/export - экспорт персональных данных пользователя (GDPR:
// право на доступ и переносимость). Отдаёт JSON-файл со всеми данными аккаунта.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function safeDecrypt(v: string | null): string | null {
  if (!v) return null;
  try {
    return decrypt(v);
  } catch {
    return null;
  }
}

export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
    include: {
      providerProfile: true,
      tasks: { include: { offers: true } },
      bookingsAsClient: { include: { reviews: true } },
      reviewsWritten: true,
      reviewsGot: true,
      favorites: true,
      notifications: true,
    },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Сообщения, где пользователь автор.
  const messages = await prisma.message.findMany({
    where: { authorId: user.id },
    select: { id: true, threadId: true, textOriginal: true, attachments: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      city: user.city,
      locale: user.locale,
      roles: user.roles,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    providerProfile: user.providerProfile,
    tasks: user.tasks.map((t) => ({
      ...t,
      address: safeDecrypt(t.addressEncrypted),
      addressEncrypted: undefined,
    })),
    orders: user.bookingsAsClient.map((b) => ({
      id: b.id,
      ref: b.ref,
      status: b.status,
      dateStart: b.dateStart,
      totalCents: b.totalCents,
      address: safeDecrypt(b.addressEncrypted),
      createdAt: b.createdAt,
    })),
    reviewsWritten: user.reviewsWritten,
    reviewsReceived: user.reviewsGot,
    messages,
    favorites: user.favorites,
    notifications: user.notifications,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="domora-data-${user.id}.json"`,
    },
  });
}

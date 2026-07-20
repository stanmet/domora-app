// GET /api/cron — регулярные задачи денежного цикла (Vercel Cron, см. vercel.json):
// истечение старых запросов и выплаты по завершённым заказам.
// Vercel добавляет заголовок Authorization: Bearer $CRON_SECRET; если секрет
// задан, проверяем его, чтобы адрес нельзя было дёргать снаружи.
import { NextResponse } from "next/server";
import { expireStaleRequests, processPayouts } from "@/lib/jobs";
import { runBotTick } from "@/lib/test-users/bots";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Fail-closed: без заданного CRON_SECRET эндпоинт закрыт полностью, чтобы его
  // нельзя было дёргать снаружи. Vercel Cron передаёт заголовок Authorization.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron disabled: set CRON_SECRET" }, { status: 401 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await expireStaleRequests().catch((e) => console.error("cron expire failed", e));
  await processPayouts().catch((e) => console.error("cron payouts failed", e));
  // Тик автосценариев тестовых ботов (уступает место реальным пользователям).
  const bots = await runBotTick().catch((e) => {
    console.error("cron bot tick failed", e);
    return null;
  });

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), bots });
}

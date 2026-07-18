// Учёт расхода токенов AI и проверка лимитов (дневного и месячного).
// При превышении генерация мягко переключается на встроенный генератор -
// это аварийное отключение AI, которое само сбрасывается со сменой дня/месяца.
import { prisma } from "@/lib/prisma";

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}
function monthPrefix(d = new Date()): string {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

export async function recordAiUsage(inputTokens: number, outputTokens: number): Promise<void> {
  if (!inputTokens && !outputTokens) return;
  const day = dayKey();
  await prisma.testAiUsage.upsert({
    where: { day },
    update: { inputTokens: { increment: inputTokens }, outputTokens: { increment: outputTokens } },
    create: { day, inputTokens, outputTokens },
  });
}

export interface AiUsage {
  todayTokens: number;
  monthTokens: number;
}

export async function getAiUsage(): Promise<AiUsage> {
  const today = await prisma.testAiUsage.findUnique({ where: { day: dayKey() } });
  const month = await prisma.testAiUsage.findMany({ where: { day: { startsWith: monthPrefix() } } });
  const todayTokens = today ? today.inputTokens + today.outputTokens : 0;
  const monthTokens = month.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
  return { todayTokens, monthTokens };
}

export interface AiLimits {
  daily: number; // 0 = без лимита
  monthly: number; // 0 = без лимита
}

// Разрешён ли ещё вызов AI при текущем расходе и лимитах.
export async function checkAiBudget(limits: AiLimits): Promise<{ allowed: boolean; reason?: string }> {
  if (!limits.daily && !limits.monthly) return { allowed: true };
  const { todayTokens, monthTokens } = await getAiUsage();
  if (limits.daily && todayTokens >= limits.daily) {
    return { allowed: false, reason: `достигнут дневной лимит токенов AI (${limits.daily})` };
  }
  if (limits.monthly && monthTokens >= limits.monthly) {
    return { allowed: false, reason: `достигнут месячный лимит токенов AI (${limits.monthly})` };
  }
  return { allowed: true };
}

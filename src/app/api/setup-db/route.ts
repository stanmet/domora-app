// Разовое применение сегодняшних изменений схемы прямо из работающего приложения
// (у рантайма есть доступ к базе, в отличие от окружения сборки Vercel).
// Все операции идемпотентны (IF NOT EXISTS), поэтому безопасно вызывать повторно.
// Доступ по ключу в query (?key=...). После применения маршрут удаляется.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const KEY = "domora-setup-864befc86351104518";

const STATEMENTS: string[] = [
  // 1) Тестовые пользователи
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS "User_isTest_idx" ON "User"("isTest")`,
  `CREATE TABLE IF NOT EXISTS "TestAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestAuditLog_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "TestAuditLog_createdAt_idx" ON "TestAuditLog"("createdAt")`,

  // 2) Боты и права администраторов
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "botEnabled" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`,
  `CREATE TABLE IF NOT EXISTS "TestBotConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "activityLevel" INTEGER NOT NULL DEFAULT 30,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestBotConfig_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "TestBotActivity" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestBotActivity_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "TestBotActivity_createdAt_idx" ON "TestBotActivity"("createdAt")`,

  // 3) Лимиты AI и индексы
  `ALTER TABLE "TestBotConfig" ADD COLUMN IF NOT EXISTS "aiDailyTokenLimit" INTEGER NOT NULL DEFAULT 200000`,
  `ALTER TABLE "TestBotConfig" ADD COLUMN IF NOT EXISTS "aiMonthlyTokenLimit" INTEGER NOT NULL DEFAULT 3000000`,
  `CREATE TABLE IF NOT EXISTS "TestAiUsage" (
    "day" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestAiUsage_pkey" PRIMARY KEY ("day")
  )`,
  `CREATE INDEX IF NOT EXISTS "User_isTest_botEnabled_idx" ON "User"("isTest", "botEnabled")`,

  // 4) Календарь доступности
  `ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "workDays" INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::INTEGER[]`,
  `ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "workStartMin" INTEGER NOT NULL DEFAULT 540`,
  `ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "workEndMin" INTEGER NOT NULL DEFAULT 1200`,
  `CREATE TABLE IF NOT EXISTS "TimeOff" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TimeOff_providerId_date_key" ON "TimeOff"("providerId", "date")`,
  `CREATE INDEX IF NOT EXISTS "TimeOff_providerId_idx" ON "TimeOff"("providerId")`,
  `DO $$ BEGIN
    ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const results: { step: number; ok: boolean; error?: string }[] = [];
  for (let i = 0; i < STATEMENTS.length; i++) {
    try {
      await prisma.$executeRawUnsafe(STATEMENTS[i]);
      results.push({ step: i + 1, ok: true });
    } catch (e) {
      results.push({ step: i + 1, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ done: allOk, results }, { status: allOk ? 200 : 500 });
}

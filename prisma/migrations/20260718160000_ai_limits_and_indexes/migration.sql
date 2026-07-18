-- Лимиты расхода AI-токенов.
ALTER TABLE "TestBotConfig" ADD COLUMN "aiDailyTokenLimit" INTEGER NOT NULL DEFAULT 200000;
ALTER TABLE "TestBotConfig" ADD COLUMN "aiMonthlyTokenLimit" INTEGER NOT NULL DEFAULT 3000000;

-- Учёт расхода токенов AI по дням.
CREATE TABLE "TestAiUsage" (
    "day" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestAiUsage_pkey" PRIMARY KEY ("day")
);

-- Индекс под выборки ботов (масштаб до многих тысяч аккаунтов).
CREATE INDEX "User_isTest_botEnabled_idx" ON "User"("isTest", "botEnabled");

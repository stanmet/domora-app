-- Индивидуальный переключатель бота и точечные права администратора.
ALTER TABLE "User" ADD COLUMN "botEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "adminScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Настройки автосценариев ботов (синглтон).
CREATE TABLE "TestBotConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "activityLevel" INTEGER NOT NULL DEFAULT 30,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestBotConfig_pkey" PRIMARY KEY ("id")
);

-- История активности ботов.
CREATE TABLE "TestBotActivity" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestBotActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TestBotActivity_createdAt_idx" ON "TestBotActivity"("createdAt");

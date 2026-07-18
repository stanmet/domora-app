-- Скрытый флаг тестового (синтетического) аккаунта. TEST_ACCOUNT из ТЗ.
ALTER TABLE "User" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- Индекс для быстрой фильтрации тестовых данных в лентах и статистике.
CREATE INDEX "User_isTest_idx" ON "User"("isTest");

-- Журнал аудита модуля тестовых пользователей.
CREATE TABLE "TestAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TestAuditLog_createdAt_idx" ON "TestAuditLog"("createdAt");

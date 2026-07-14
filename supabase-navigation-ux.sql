-- ============================================================
-- Domora · миграция "Навигация и UX" для Supabase
-- Запускается в SQL Editor один раз. Все команды идемпотентны:
-- повторный запуск не ломает уже применённые изменения.
--
-- Что добавляет:
--   1. ProviderProfile.portfolioPhotos - галерея работ (до 20 фото)
--   2. TaskView - кто из исполнителей открывал задачу (счётчик просмотров)
--   3. Translation - кеш автопереводов пользовательских текстов
-- ============================================================

-- 1. Галерея работ в профиле исполнителя
ALTER TABLE "ProviderProfile"
  ADD COLUMN IF NOT EXISTS "portfolioPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Просмотры задачи исполнителями
CREATE TABLE IF NOT EXISTS "TaskView" (
    "taskId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskView_pkey" PRIMARY KEY ("taskId","providerId")
);
CREATE INDEX IF NOT EXISTS "TaskView_taskId_idx" ON "TaskView"("taskId");

-- 3. Кеш автопереводов
CREATE TABLE IF NOT EXISTS "Translation" (
    "sourceHash" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Translation_pkey" PRIMARY KEY ("sourceHash","targetLang")
);

-- ============================================================
-- 4. Отметка миграции для Prisma, чтобы "prisma migrate deploy"
--    не пытался применить её повторно.
-- ============================================================
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
SELECT
    gen_random_uuid(),
    'manual-navigation-ux',
    now(),
    '20260714200000_navigation_ux',
    now(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260714200000_navigation_ux'
);

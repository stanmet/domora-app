-- Domora · supabase-task-board.sql
-- Добавляет в базу таблицы доски задач (Task, Offer) из миграции
-- 20260714161529_task_board_and_offers. Нужно, если база создавалась через
-- setup.sql до появления доски задач.
--
-- Как применить: Supabase Dashboard -> SQL Editor -> New query ->
-- вставить весь этот файл -> Run.
--
-- Безопасно запускать повторно: всё через IF NOT EXISTS и защиту от дублей.

-- ============================================================
-- 1. Типы статусов
-- ============================================================
DO $$ BEGIN
  CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'OFFER_ACCEPTED', 'CLOSED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 2. Таблицы
-- ============================================================
CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dateWanted" TIMESTAMP(3),
    "city" TEXT NOT NULL,
    "addressEncrypted" TEXT NOT NULL,
    "budgetFromCents" INTEGER,
    "budgetToCents" INTEGER,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Offer" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "contactFilterFlag" BOOLEAN NOT NULL DEFAULT false,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 3. Индексы
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS "Task_bookingId_key" ON "Task"("bookingId");
CREATE INDEX IF NOT EXISTS "Task_categoryId_city_status_idx" ON "Task"("categoryId", "city", "status");
CREATE INDEX IF NOT EXISTS "Task_clientId_status_idx" ON "Task"("clientId", "status");
CREATE INDEX IF NOT EXISTS "Offer_taskId_status_idx" ON "Offer"("taskId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "Offer_taskId_providerId_key" ON "Offer"("taskId", "providerId");

-- ============================================================
-- 4. Внешние ключи
-- ============================================================
DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Offer" ADD CONSTRAINT "Offer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Offer" ADD CONSTRAINT "Offer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 5. Отметка миграции для Prisma (чтобы "prisma migrate deploy"
--    не пытался применить её повторно). Вставляется только если её ещё нет.
-- ============================================================
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
SELECT
    gen_random_uuid(),
    '6bc011324c9a5cf032fe8e4f3ea134baf29334c76f8150188c4d2fc42af5736d',
    now(),
    '20260714161529_task_board_and_offers',
    now(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260714161529_task_board_and_offers'
);

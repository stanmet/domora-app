// Применение схемы новых возможностей прямо из кода, идемпотентно.
// Причина: база Domora подключена через пул Supabase (порт 6543), а
// "prisma migrate deploy" через пул не работает и ронял сборку. Поэтому нужные
// таблицы и колонки создаются здесь при первом обращении - безопасно
// (IF NOT EXISTS) и без ручных шагов. Выполняется один раз на процесс.
import { prisma } from "./prisma";
import { seedSubcategories } from "./subcategories";
import { ensureCategories } from "./category-seed";

let ensured = false;

export async function ensureSchema(): Promise<void> {
  if (ensured) return;
  ensured = true; // отмечаем сразу, чтобы параллельные запросы не дублировали DDL
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "portfolioPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "TaskView" (
         "taskId" TEXT NOT NULL,
         "providerId" TEXT NOT NULL,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "TaskView_pkey" PRIMARY KEY ("taskId","providerId")
       )`,
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TaskView_taskId_idx" ON "TaskView"("taskId")`);
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "Translation" (
         "sourceHash" TEXT NOT NULL,
         "targetLang" TEXT NOT NULL,
         "sourceLang" TEXT NOT NULL,
         "text" TEXT NOT NULL,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "Translation_pkey" PRIMARY KEY ("sourceHash","targetLang")
       )`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "ProviderDocument" (
         "id" TEXT NOT NULL,
         "providerId" TEXT NOT NULL,
         "url" TEXT NOT NULL,
         "kind" TEXT NOT NULL DEFAULT 'other',
         "label" TEXT,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "ProviderDocument_pkey" PRIMARY KEY ("id")
       )`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ProviderDocument_providerId_idx" ON "ProviderDocument"("providerId")`,
    );
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProviderDocument" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3)`);
    // Дерево подкатегорий услуг.
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "Subcategory" (
         "id" TEXT NOT NULL,
         "categoryId" TEXT NOT NULL,
         "slug" TEXT NOT NULL,
         "nameEn" TEXT NOT NULL,
         "nameRu" TEXT NOT NULL,
         "order" INTEGER NOT NULL DEFAULT 0,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
       )`,
    );
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Subcategory_slug_key" ON "Subcategory"("slug")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Subcategory_categoryId_order_idx" ON "Subcategory"("categoryId","order")`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "subcategoryId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "subcategoryId" TEXT`);

    // Подписки на регулярные визиты (создаём при необходимости, добавляем createdAt).
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "Subscription" (
         "id" TEXT NOT NULL,
         "clientId" TEXT NOT NULL,
         "listingId" TEXT NOT NULL,
         "rrule" TEXT NOT NULL,
         "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 10,
         "status" TEXT NOT NULL DEFAULT 'active',
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
       )`,
    );
    await prisma.$executeRawUnsafe(`ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Subscription_clientId_idx" ON "Subscription"("clientId")`);

    // Уведомления пользователю (колокольчик).
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "Notification" (
         "id" TEXT NOT NULL,
         "userId" TEXT NOT NULL,
         "type" TEXT NOT NULL,
         "payload" JSONB NOT NULL DEFAULT '{}',
         "readAt" TIMESTAMP(3),
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
       )`,
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId","readAt")`);

    // Купоны-скидки заказчику.
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "Coupon" (
         "id" TEXT NOT NULL,
         "code" TEXT NOT NULL,
         "clientId" TEXT NOT NULL,
         "pct" INTEGER NOT NULL DEFAULT 10,
         "reason" TEXT NOT NULL,
         "status" TEXT NOT NULL DEFAULT 'active',
         "sourceBookingId" TEXT,
         "usedBookingId" TEXT,
         "expiresAt" TIMESTAMP(3) NOT NULL,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
       )`,
    );
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Coupon_clientId_status_idx" ON "Coupon"("clientId","status")`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "couponId" TEXT`);

    // Читаемый номер заказа DM-XXXXXX. Добавляем колонку, разово проставляем
    // номер старым заказам (из хеша id), затем делаем индекс уникальным.
    await prisma.$executeRawUnsafe(`ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "ref" TEXT`);
    await prisma.$executeRawUnsafe(
      `UPDATE "Booking" SET "ref" = 'DM-' || upper(substr(md5("id" || random()::text), 1, 6)) WHERE "ref" IS NULL`,
    );
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Booking_ref_key" ON "Booking"("ref")`);

    // Тестовые пользователи (флаг TEST_ACCOUNT) и журнал аудита.
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_isTest_idx" ON "User"("isTest")`);
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "TestAuditLog" (
         "id" TEXT NOT NULL, "action" TEXT NOT NULL, "actorId" TEXT, "count" INTEGER NOT NULL DEFAULT 0,
         "detail" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "TestAuditLog_pkey" PRIMARY KEY ("id"))`,
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TestAuditLog_createdAt_idx" ON "TestAuditLog"("createdAt")`);

    // Индивидуальный переключатель бота и точечные права администратора.
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "botEnabled" BOOLEAN NOT NULL DEFAULT true`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_isTest_botEnabled_idx" ON "User"("isTest", "botEnabled")`);

    // Настройки и активность ботов, учёт токенов AI.
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "TestBotConfig" (
         "id" TEXT NOT NULL DEFAULT 'singleton', "enabled" BOOLEAN NOT NULL DEFAULT false,
         "activityLevel" INTEGER NOT NULL DEFAULT 30, "provider" TEXT NOT NULL DEFAULT 'anthropic',
         "aiDailyTokenLimit" INTEGER NOT NULL DEFAULT 200000, "aiMonthlyTokenLimit" INTEGER NOT NULL DEFAULT 3000000,
         "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "TestBotConfig_pkey" PRIMARY KEY ("id"))`,
    );
    await prisma.$executeRawUnsafe(`ALTER TABLE "TestBotConfig" ADD COLUMN IF NOT EXISTS "aiDailyTokenLimit" INTEGER NOT NULL DEFAULT 200000`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "TestBotConfig" ADD COLUMN IF NOT EXISTS "aiMonthlyTokenLimit" INTEGER NOT NULL DEFAULT 3000000`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "TestBotConfig" ADD COLUMN IF NOT EXISTS "demoMode" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "TestBotActivity" (
         "id" TEXT NOT NULL, "action" TEXT NOT NULL, "actorId" TEXT, "detail" TEXT,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "TestBotActivity_pkey" PRIMARY KEY ("id"))`,
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TestBotActivity_createdAt_idx" ON "TestBotActivity"("createdAt")`);
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "TestAiUsage" (
         "day" TEXT NOT NULL, "inputTokens" INTEGER NOT NULL DEFAULT 0, "outputTokens" INTEGER NOT NULL DEFAULT 0,
         "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TestAiUsage_pkey" PRIMARY KEY ("day"))`,
    );

    // Календарь доступности исполнителя.
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "workDays" INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::INTEGER[]`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "workStartMin" INTEGER NOT NULL DEFAULT 540`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "workEndMin" INTEGER NOT NULL DEFAULT 1200`);
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "TimeOff" (
         "id" TEXT NOT NULL, "providerId" TEXT NOT NULL, "date" DATE NOT NULL,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id"))`,
    );
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TimeOff_providerId_date_key" ON "TimeOff"("providerId", "date")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TimeOff_providerId_idx" ON "TimeOff"("providerId")`);

    // Необязательные реквизиты исполнителя для инвойса (налоговая).
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "legalName" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "businessAddress" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT`);

    // Новые поля V1: аватар пользователя, фото заявки, отметка прочтения чата.
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3)`);
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "ChatBlock" (
         "id" TEXT NOT NULL, "blockerId" TEXT NOT NULL, "blockedId" TEXT NOT NULL,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ChatBlock_pkey" PRIMARY KEY ("id"))`,
    );
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ChatBlock_blockerId_blockedId_key" ON "ChatBlock"("blockerId", "blockedId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ChatBlock_blockedId_idx" ON "ChatBlock"("blockedId")`);

    // Безопасность: включаем RLS на всех таблицах схемы public. Prisma ходит в
    // базу под ролью-владельцем и RLS обходит, а публичный REST-API Supabase по
    // анонимному ключу без разрешающих политик не отдаёт данные посторонним.
    // Делаем и здесь (не только в setup.sql), чтобы таблицы, созданные этим
    // файлом на лету, тоже были защищены. Идемпотентно.
    await prisma.$executeRawUnsafe(
      `DO $$ DECLARE r RECORD; BEGIN
         FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
         LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename); END LOOP;
       END $$;`,
    );

    // Наполняем категории и дерево подкатегорий данными (идемпотентно).
    // Категории - первыми: подкатегории ссылаются на них по slug.
    await ensureCategories();
    await seedSubcategories();
  } catch (e) {
    ensured = false; // не получилось - попробуем при следующем запросе
    console.error("ensureSchema failed", e);
  }
}

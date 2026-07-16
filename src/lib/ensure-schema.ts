// Применение схемы новых возможностей прямо из кода, идемпотентно.
// Причина: база Domora подключена через пул Supabase (порт 6543), а
// "prisma migrate deploy" через пул не работает и ронял сборку. Поэтому нужные
// таблицы и колонки создаются здесь при первом обращении - безопасно
// (IF NOT EXISTS) и без ручных шагов. Выполняется один раз на процесс.
import { prisma } from "./prisma";
import { seedSubcategories } from "./subcategories";

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

    // Наполняем дерево подкатегорий данными (идемпотентно).
    await seedSubcategories();
  } catch (e) {
    ensured = false; // не получилось - попробуем при следующем запросе
    console.error("ensureSchema failed", e);
  }
}

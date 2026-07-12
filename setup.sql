-- Domora · setup.sql
-- Полная установка пустой базы Supabase одним скриптом:
--   1) схема БД (копия prisma/migrations/20260712135210_init/migration.sql)
--   2) отметка миграции для Prisma (_prisma_migrations), чтобы будущие
--      "prisma migrate deploy" не пытались применить схему повторно
--   3) seed-данные: 7 категорий и 3 тестовых исполнителя с плашками
-- Запускать один раз на ПУСТОЙ базе (Supabase -> SQL Editor -> Run).

-- ============================================================
-- 1. СХЕМА
-- ============================================================

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'PROVIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'RESTRICTED', 'FROZEN', 'BANNED');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('DRAFT', 'MODERATION', 'ACTIVE', 'PAUSED', 'FROZEN', 'BANNED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'MODERATION', 'ACTIVE', 'PAUSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('PER_GUEST', 'PER_M2', 'PER_HOUR', 'PER_SESSION', 'PER_EVENT', 'FIXED_QUOTE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'REQUESTED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_PROVIDER', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('HOLD', 'CAPTURED', 'PARTIAL_REFUND', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('SCHEDULED', 'FROZEN', 'DONE', 'REVERSED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NEGOTIATION', 'ARBITRATION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "StrikeType" AS ENUM ('PROVIDER_CANCEL', 'PROVIDER_NO_SHOW', 'QUALITY_CONFIRMED', 'OFFLINE_ATTEMPT', 'ABUSE_CHAT', 'FAKE_EVIDENCE', 'CLIENT_UNFOUNDED_DISPUTES', 'CLIENT_LATE_CANCELS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "city" TEXT,
    "roles" "Role"[] DEFAULT ARRAY['CLIENT']::"Role"[],
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProfile" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "customProfession" TEXT,
    "bio" TEXT,
    "bioLang" TEXT NOT NULL DEFAULT 'en',
    "city" TEXT NOT NULL,
    "travelRadiusKm" INTEGER NOT NULL DEFAULT 20,
    "stripeAccountId" TEXT,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "identityVerifiedAt" TIMESTAMP(3),
    "insuranceDocUrl" TEXT,
    "insuranceExpiresAt" TIMESTAMP(3),
    "gardaVetted" BOOLEAN NOT NULL DEFAULT false,
    "ratingCached" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "jobsCount" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" DECIMAL(4,3) NOT NULL DEFAULT 1,
    "responseMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "ProviderStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "ProviderProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "unitDefault" "PriceUnit" NOT NULL,
    "cancellationTier" TEXT NOT NULL DEFAULT 'standard',
    "clientFeePct" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "providerFeePct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "minProvidersToOpen" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "professionLabel" TEXT,
    "title" TEXT NOT NULL,
    "titleLang" TEXT NOT NULL DEFAULT 'en',
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "unit" "PriceUnit" NOT NULL,
    "materialsIncluded" BOOLEAN NOT NULL DEFAULT true,
    "quoteFirst" BOOLEAN NOT NULL DEFAULT false,
    "photos" TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'MODERATION',
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "dateStart" TIMESTAMP(3) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unit" "PriceUnit" NOT NULL,
    "priceCentsSnapshot" INTEGER NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "clientFeeCents" INTEGER NOT NULL,
    "providerFeeCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "addressEncrypted" TEXT,
    "accessNoteEncrypted" TEXT,
    "seriesId" TEXT,
    "requestExpiresAt" TIMESTAMP(3),
    "disputeWindowEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "scopeText" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'HOLD',
    "capturedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "stripeTransferId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" "TransferStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "stripeRefundId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "disputeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'NEGOTIATION',
    "resolutionCode" TEXT,
    "resolutionCents" INTEGER,
    "arbiterId" TEXT,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "text" TEXT,
    "textLang" TEXT NOT NULL DEFAULT 'en',
    "publishedAt" TIMESTAMP(3),
    "disputeFlag" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "textOriginal" TEXT NOT NULL,
    "langOriginal" TEXT NOT NULL,
    "translations" JSONB,
    "attachments" TEXT[],
    "contactFilterFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StrikeType" NOT NULL,
    "bookingId" TEXT,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Strike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","providerId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "rrule" TEXT NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfile_stripeAccountId_key" ON "ProviderProfile"("stripeAccountId");

-- CreateIndex
CREATE INDEX "ProviderProfile_city_status_idx" ON "ProviderProfile"("city", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Listing_categoryId_status_idx" ON "Listing"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Booking_providerId_status_idx" ON "Booking"("providerId", "status");

-- CreateIndex
CREATE INDEX "Booking_clientId_status_idx" ON "Booking"("clientId", "status");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_bookingId_key" ON "Quote"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_bookingId_key" ON "Transfer"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_stripeTransferId_key" ON "Transfer"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "Refund"("stripeRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_bookingId_key" ON "Dispute"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_authorId_key" ON "Review"("bookingId", "authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Thread_bookingId_key" ON "Thread"("bookingId");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Strike_userId_expiresAt_idx" ON "Strike"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strike" ADD CONSTRAINT "Strike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 2. ОТМЕТКА МИГРАЦИИ ДЛЯ PRISMA
-- ============================================================
-- Позволяет позже запускать "npx prisma migrate deploy" без конфликтов:
-- Prisma увидит, что миграция 20260712135210_init уже применена.

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    VARCHAR(36) NOT NULL,
    "checksum"              VARCHAR(64) NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        VARCHAR(255) NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count"   INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
VALUES (
    gen_random_uuid(),
    '00e333a05e5df9c5025c058ec6167bee5dc4d3bf271a41a01c82a8039e8a8687',
    now(),
    '20260712135210_init',
    now(),
    1
);

-- ============================================================
-- 3. SEED: КАТЕГОРИИ
-- ============================================================

INSERT INTO "Category" ("id", "slug", "nameEn", "nameRu", "unitDefault", "cancellationTier") VALUES
  ('cat_chef',    'chef',    'Private chef',     'Повар на дом',        'PER_GUEST',   'standard'),
  ('cat_clean',   'clean',   'Cleaning',         'Уборка',              'PER_M2',      'standard'),
  ('cat_handy',   'handy',   'Handyman',         'Мастер на час',       'PER_HOUR',    'standard'),
  ('cat_massage', 'massage', 'Massage',          'Массаж',              'PER_SESSION', 'standard'),
  ('cat_beauty',  'beauty',  'Beauty at home',   'Красота на дому',     'PER_SESSION', 'standard'),
  ('cat_events',  'events',  'Events & parties', 'Праздники и события', 'PER_EVENT',   'event'),
  ('cat_other',   'other',   'Other',            'Другое',              'FIXED_QUOTE', 'standard')
ON CONFLICT ("slug") DO NOTHING;

-- ============================================================
-- 4. SEED: ТЕСТОВЫЕ ИСПОЛНИТЕЛИ (пользователь + профиль + плашка)
-- ============================================================

INSERT INTO "User" ("id", "email", "name", "roles", "city") VALUES
  ('usr_test_chef',  'chef@test.domora.ie',  'Aoife Byrne',    ARRAY['PROVIDER']::"Role"[], 'Dublin'),
  ('usr_test_clean', 'clean@test.domora.ie', 'Marta Kowalska', ARRAY['PROVIDER']::"Role"[], 'Cork'),
  ('usr_test_handy', 'handy@test.domora.ie', 'Sean Murphy',    ARRAY['PROVIDER']::"Role"[], 'Galway')
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "ProviderProfile" ("userId", "displayName", "customProfession", "bio", "city", "status") VALUES
  ('usr_test_chef',  'Aoife Byrne',    'Повар на дом',  'Домашние ужины и meal prep на неделю. 8 лет опыта в ресторанах Дублина.', 'Dublin', 'ACTIVE'),
  ('usr_test_clean', 'Marta Kowalska', 'Клинер',        'Генеральная и регулярная уборка квартир и офисов.',                       'Cork',   'ACTIVE'),
  ('usr_test_handy', 'Sean Murphy',    'Мастер на час', 'Мелкий ремонт, сборка мебели, установка бытовой техники.',                'Galway', 'ACTIVE')
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "Listing" ("id", "providerId", "categoryId", "professionLabel", "title", "priceCents", "unit", "photos", "status") VALUES
  ('lst_test_chef',  'usr_test_chef',  'cat_chef',  'Повар на дом',  'Ужин на дому для компании до 8 человек', 4500, 'PER_GUEST', ARRAY[]::TEXT[], 'ACTIVE'),
  ('lst_test_clean', 'usr_test_clean', 'cat_clean', 'Клинер',        'Генеральная уборка квартиры',             250, 'PER_M2',    ARRAY[]::TEXT[], 'ACTIVE'),
  ('lst_test_handy', 'usr_test_handy', 'cat_handy', 'Мастер на час', 'Мелкий ремонт и сборка мебели',          3500, 'PER_HOUR',  ARRAY[]::TEXT[], 'ACTIVE')
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 5. ПРОВЕРКА
-- ============================================================
-- После выполнения этот запрос должен вернуть 7 категорий и 3 плашки:

SELECT
  (SELECT count(*) FROM "Category")        AS categories,
  (SELECT count(*) FROM "User")            AS users,
  (SELECT count(*) FROM "ProviderProfile") AS providers,
  (SELECT count(*) FROM "Listing")         AS listings;

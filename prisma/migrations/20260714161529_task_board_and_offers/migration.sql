-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'OFFER_ACCEPTED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Task" (
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

-- CreateTable
CREATE TABLE "Offer" (
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

-- CreateIndex
CREATE UNIQUE INDEX "Task_bookingId_key" ON "Task"("bookingId");

-- CreateIndex
CREATE INDEX "Task_categoryId_city_status_idx" ON "Task"("categoryId", "city", "status");

-- CreateIndex
CREATE INDEX "Task_clientId_status_idx" ON "Task"("clientId", "status");

-- CreateIndex
CREATE INDEX "Offer_taskId_status_idx" ON "Offer"("taskId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_taskId_providerId_key" ON "Offer"("taskId", "providerId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

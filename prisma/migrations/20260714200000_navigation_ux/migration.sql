-- AlterTable: галерея работ исполнителя в профиле
ALTER TABLE "ProviderProfile" ADD COLUMN "portfolioPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable: просмотры задачи исполнителями (счётчик "N увидели")
CREATE TABLE "TaskView" (
    "taskId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskView_pkey" PRIMARY KEY ("taskId","providerId")
);

-- CreateIndex
CREATE INDEX "TaskView_taskId_idx" ON "TaskView"("taskId");

-- CreateTable: кеш автопереводов пользовательских текстов
CREATE TABLE "Translation" (
    "sourceHash" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("sourceHash","targetLang")
);

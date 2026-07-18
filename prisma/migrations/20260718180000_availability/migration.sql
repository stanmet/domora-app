-- Календарь доступности исполнителя: рабочие дни и окно приёма заказов.
ALTER TABLE "ProviderProfile" ADD COLUMN "workDays" INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::INTEGER[];
ALTER TABLE "ProviderProfile" ADD COLUMN "workStartMin" INTEGER NOT NULL DEFAULT 540;
ALTER TABLE "ProviderProfile" ADD COLUMN "workEndMin" INTEGER NOT NULL DEFAULT 1200;

-- Заблокированные дни (выходной, отпуск).
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimeOff_providerId_date_key" ON "TimeOff"("providerId", "date");
CREATE INDEX "TimeOff_providerId_idx" ON "TimeOff"("providerId");

ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

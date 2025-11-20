/*
  Warnings:

  - A unique constraint covering the columns `[stripeId]` on the table `organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "apiRatelimit" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "billingCycleStart" INTEGER,
ADD COLUMN     "pagesLimit" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "paymentFailedAt" TIMESTAMP(3),
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "searchLimit" INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN     "searchUsage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeId" TEXT,
ADD COLUMN     "totalDocuments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalIngestJobs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalNamespaces" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPages" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usageLastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "organization_stripeId_key" ON "organization"("stripeId");

-- CreateIndex
CREATE INDEX "organization_usageLastChecked_idx" ON "organization"("usageLastChecked" ASC);

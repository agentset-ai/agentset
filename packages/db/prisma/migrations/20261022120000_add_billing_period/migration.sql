-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "billingPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "billingPeriodStart" TIMESTAMP(3),
ADD COLUMN     "meteredPeriodStart" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "organization_billingPeriodEnd_idx" ON "organization"("billingPeriodEnd");

-- AlterTable
ALTER TABLE "document" ADD COLUMN     "meteredAt" TIMESTAMP(3);

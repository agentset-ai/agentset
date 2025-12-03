-- AlterTable
ALTER TABLE "document" ADD COLUMN     "documentConfig" JSONB;

-- CreateIndex
CREATE INDEX "ingest_job_status_idx" ON "ingest_job"("status");

-- CreateIndex
CREATE INDEX "ingest_job_tenantId_status_idx" ON "ingest_job"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ingest_job_namespaceId_status_idx" ON "ingest_job"("namespaceId", "status");

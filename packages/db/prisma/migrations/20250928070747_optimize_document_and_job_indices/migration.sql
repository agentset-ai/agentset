-- DropIndex
DROP INDEX "public"."document_ingestJobId_status_idx";

-- DropIndex
DROP INDEX "public"."document_ingestJobId_tenantId_idx";

-- DropIndex
DROP INDEX "public"."document_ingestJobId_tenantId_status_idx";

-- DropIndex
DROP INDEX "public"."document_namespaceId_idx";

-- DropIndex
DROP INDEX "public"."document_namespaceId_status_idx";

-- DropIndex
DROP INDEX "public"."document_namespaceId_tenantId_idx";

-- DropIndex
DROP INDEX "public"."document_namespaceId_tenantId_status_idx";

-- DropIndex
DROP INDEX "public"."ingest_job_namespaceId_idx";

-- DropIndex
DROP INDEX "public"."ingest_job_namespaceId_status_idx";

-- DropIndex
DROP INDEX "public"."ingest_job_namespaceId_tenantId_idx";

-- DropIndex
DROP INDEX "public"."ingest_job_namespaceId_tenantId_status_idx";

-- DropIndex
DROP INDEX "public"."ingest_job_status_idx";

-- CreateIndex
CREATE INDEX "document_namespaceId_createdAt_id_idx" ON "public"."document"("namespaceId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "document_namespaceId_status_createdAt_id_idx" ON "public"."document"("namespaceId", "status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "document_namespaceId_tenantId_createdAt_id_idx" ON "public"."document"("namespaceId", "tenantId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "document_ingestJobId_createdAt_id_idx" ON "public"."document"("ingestJobId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "document_ingestJobId_status_createdAt_id_idx" ON "public"."document"("ingestJobId", "status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "document_ingestJobId_tenantId_createdAt_id_idx" ON "public"."document"("ingestJobId", "tenantId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "ingest_job_namespaceId_createdAt_id_idx" ON "public"."ingest_job"("namespaceId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "ingest_job_namespaceId_status_createdAt_id_idx" ON "public"."ingest_job"("namespaceId", "status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "ingest_job_namespaceId_tenantId_createdAt_id_idx" ON "public"."ingest_job"("namespaceId", "tenantId", "createdAt" DESC, "id" DESC);

/*
  Warnings:

  - A unique constraint covering the columns `[namespaceId,externalId]` on the table `document` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[namespaceId,externalId]` on the table `ingest_job` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."document_status_idx";

-- DropIndex
DROP INDEX "public"."document_tenantId_status_idx";

-- DropIndex
DROP INDEX "public"."ingest_job_tenantId_status_idx";

-- AlterTable
ALTER TABLE "public"."document" ADD COLUMN     "namespaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."ingest_job" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE INDEX "document_namespaceId_status_idx" ON "public"."document"("namespaceId", "status");

-- CreateIndex
CREATE INDEX "document_namespaceId_tenantId_status_idx" ON "public"."document"("namespaceId", "tenantId", "status");

-- CreateIndex
CREATE INDEX "document_namespaceId_tenantId_idx" ON "public"."document"("namespaceId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "document_namespaceId_externalId_key" ON "public"."document"("namespaceId", "externalId");

-- CreateIndex
CREATE INDEX "ingest_job_namespaceId_tenantId_idx" ON "public"."ingest_job"("namespaceId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ingest_job_namespaceId_externalId_key" ON "public"."ingest_job"("namespaceId", "externalId");

-- AddForeignKey
ALTER TABLE "public"."document" ADD CONSTRAINT "document_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "public"."namespace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

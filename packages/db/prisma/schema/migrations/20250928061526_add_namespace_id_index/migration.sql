-- CreateIndex
CREATE INDEX "document_namespaceId_idx" ON "public"."document"("namespaceId");

-- CreateIndex
CREATE INDEX "ingest_job_namespaceId_idx" ON "public"."ingest_job"("namespaceId");

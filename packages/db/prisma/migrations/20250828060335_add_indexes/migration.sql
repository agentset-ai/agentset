-- CreateIndex
CREATE INDEX "document_status_idx" ON "public"."document"("status");

-- CreateIndex
CREATE INDEX "document_tenantId_status_idx" ON "public"."document"("tenantId", "status");

-- CreateIndex
CREATE INDEX "document_ingestJobId_status_idx" ON "public"."document"("ingestJobId", "status");

-- CreateIndex
CREATE INDEX "document_ingestJobId_tenantId_idx" ON "public"."document"("ingestJobId", "tenantId");

-- CreateIndex
CREATE INDEX "document_ingestJobId_tenantId_status_idx" ON "public"."document"("ingestJobId", "tenantId", "status");

-- CreateIndex
CREATE INDEX "ingest_job_namespaceId_tenantId_status_idx" ON "public"."ingest_job"("namespaceId", "tenantId", "status");

-- CreateIndex
CREATE INDEX "namespace_status_idx" ON "public"."namespace"("status");

-- CreateIndex
CREATE INDEX "namespace_organizationId_status_idx" ON "public"."namespace"("organizationId", "status");

-- CreateIndex
CREATE INDEX "organization_status_idx" ON "public"."organization"("status");

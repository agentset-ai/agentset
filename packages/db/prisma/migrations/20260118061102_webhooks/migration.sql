-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "triggers" JSONB NOT NULL,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NamespaceWebhook" (
    "id" TEXT NOT NULL,
    "namespaceId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,

    CONSTRAINT "NamespaceWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Webhook_organizationId_idx" ON "Webhook"("organizationId");

-- CreateIndex
CREATE INDEX "NamespaceWebhook_webhookId_idx" ON "NamespaceWebhook"("webhookId");

-- CreateIndex
CREATE UNIQUE INDEX "NamespaceWebhook_namespaceId_webhookId_key" ON "NamespaceWebhook"("namespaceId", "webhookId");

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NamespaceWebhook" ADD CONSTRAINT "NamespaceWebhook_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "namespace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NamespaceWebhook" ADD CONSTRAINT "NamespaceWebhook_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

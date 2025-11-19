-- CreateTable
CREATE TABLE "Hosting" (
    "id" TEXT NOT NULL,
    "namespaceId" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "exampleQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "welcomeMessage" TEXT,
    "protected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hostingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hosting_namespaceId_key" ON "Hosting"("namespaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_slug_key" ON "Domain"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_hostingId_key" ON "Domain"("hostingId");

-- CreateIndex
CREATE INDEX "Domain_lastChecked_idx" ON "Domain"("lastChecked" ASC);

-- AddForeignKey
ALTER TABLE "Hosting" ADD CONSTRAINT "Hosting_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "namespace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_hostingId_fkey" FOREIGN KEY ("hostingId") REFERENCES "Hosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('BACKLOG', 'QUEUED', 'PRE_PROCESSING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "IngestJobStatus" ADD VALUE 'BACKLOG';

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT,
    "tenantId" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'BACKLOG',
    "error" TEXT,
    "documentProperties" JSONB,
    "metadata" JSONB,
    "queuedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "preProcessingAt" TIMESTAMP(3),
    "processingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "ingestJobId" TEXT NOT NULL,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCharacters" INTEGER NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_ingestJobId_fkey" FOREIGN KEY ("ingestJobId") REFERENCES "ingest_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

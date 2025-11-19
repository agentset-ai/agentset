-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('NOTION', 'GOOGLE_DRIVE', 'DROPBOX', 'ONE_DRIVE');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "IngestJobStatus" AS ENUM ('QUEUED', 'PRE_PROCESSING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "namespace" ADD COLUMN     "embeddingConfig" JSONB,
ADD COLUMN     "fileStoreConfig" JSONB,
ADD COLUMN     "vectorStoreConfig" JSONB;

-- CreateTable
CREATE TABLE "connection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ConnectionType" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "statusDetails" TEXT,
    "clientRedirectUrl" TEXT,
    "config" JSONB,
    "namespaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_job" (
    "id" TEXT NOT NULL,
    "namespaceId" TEXT NOT NULL,
    "status" "IngestJobStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "payload" JSONB NOT NULL,
    "config" JSONB,
    "queuedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "preProcessingAt" TIMESTAMP(3),
    "processingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingest_job_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "connection" ADD CONSTRAINT "connection_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "namespace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingest_job" ADD CONSTRAINT "ingest_job_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "namespace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

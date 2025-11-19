/*
  Warnings:

  - Added the required column `source` to the `document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "document" ADD COLUMN     "source" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "ingest_job" ADD COLUMN     "tenantId" TEXT;

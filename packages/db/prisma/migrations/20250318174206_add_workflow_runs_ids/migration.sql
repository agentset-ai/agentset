-- AlterTable
ALTER TABLE "document" ADD COLUMN     "workflowRunsIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ingest_job" ADD COLUMN     "workflowRunsIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

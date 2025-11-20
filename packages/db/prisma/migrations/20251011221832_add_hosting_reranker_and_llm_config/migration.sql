-- AlterTable
ALTER TABLE "public"."Hosting" ADD COLUMN     "llmConfig" JSONB,
ADD COLUMN     "rerankConfig" JSONB;

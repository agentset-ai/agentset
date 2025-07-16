-- CreateEnum
CREATE TYPE "NamespaceStatus" AS ENUM ('ACTIVE', 'DELETING');

-- AlterTable
ALTER TABLE "namespace" ADD COLUMN     "status" "NamespaceStatus" NOT NULL DEFAULT 'ACTIVE';

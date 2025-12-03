-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentStatus" ADD VALUE 'QUEUED_FOR_RESYNC';
ALTER TYPE "DocumentStatus" ADD VALUE 'QUEUED_FOR_DELETE';
ALTER TYPE "DocumentStatus" ADD VALUE 'DELETING';
ALTER TYPE "DocumentStatus" ADD VALUE 'CANCELLING';

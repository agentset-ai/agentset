/*
  Warnings:

  - You are about to drop the column `metadata` on the `document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "document" DROP COLUMN "metadata",
ADD COLUMN     "config" JSONB;

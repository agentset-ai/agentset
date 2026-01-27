/*
  Warnings:

  - Made the column `namespaceId` on table `document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "document" ALTER COLUMN "namespaceId" SET NOT NULL;

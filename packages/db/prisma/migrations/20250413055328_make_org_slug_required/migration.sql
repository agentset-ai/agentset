/*
  Warnings:

  - Made the column `slug` on table `organization` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "organization" ALTER COLUMN "slug" SET NOT NULL;

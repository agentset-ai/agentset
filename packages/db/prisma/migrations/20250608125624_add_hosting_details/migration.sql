/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Hosting` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Hosting" ADD COLUMN     "logo" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Hosting_slug_key" ON "Hosting"("slug");

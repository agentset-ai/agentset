/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,slug]` on the table `namespace` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "namespace_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "namespace_organizationId_slug_key" ON "namespace"("organizationId", "slug");

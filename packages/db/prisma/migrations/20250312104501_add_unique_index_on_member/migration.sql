/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,userId]` on the table `member` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

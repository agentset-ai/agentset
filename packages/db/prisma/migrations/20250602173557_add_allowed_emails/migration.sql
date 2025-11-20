-- AlterTable
ALTER TABLE "Hosting" ADD COLUMN     "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowedEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];

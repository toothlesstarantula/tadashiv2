-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "currentInstallment" INTEGER DEFAULT 1,
ADD COLUMN     "installments" INTEGER DEFAULT 1;

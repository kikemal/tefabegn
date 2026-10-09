-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "recipientConfirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ItemReport" ADD COLUMN     "returnedAt" TIMESTAMP(3);

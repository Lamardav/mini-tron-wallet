-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "balance_after" BIGINT,
ADD COLUMN     "balance_before" BIGINT,
ADD COLUMN     "block_number" BIGINT,
ADD COLUMN     "fee" BIGINT;

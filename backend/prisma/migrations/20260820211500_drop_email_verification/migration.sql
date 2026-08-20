-- DropIndex
DROP INDEX "users_verification_hash_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email_verified_at",
DROP COLUMN "verification_hash",
DROP COLUMN "verification_sent_at";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "verification_hash" TEXT,
ADD COLUMN     "verification_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_verification_hash_idx" ON "users"("verification_hash");

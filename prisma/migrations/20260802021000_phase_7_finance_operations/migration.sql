ALTER TABLE "vendor_payout_requests"
  ADD COLUMN "reviewed_by" UUID,
  ADD COLUMN "rejection_reason" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "vendor_payout_requests"
  ADD CONSTRAINT "vendor_payout_requests_bank_account_id_fkey"
  FOREIGN KEY ("bank_account_id") REFERENCES "vendor_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "vendor_payout_requests_bank_account_id_idx" ON "vendor_payout_requests"("bank_account_id");

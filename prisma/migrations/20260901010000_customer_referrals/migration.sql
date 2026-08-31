CREATE TABLE "referral_codes" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "code" VARCHAR(24) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_referrals" (
  "id" UUID NOT NULL,
  "referral_code_id" UUID NOT NULL,
  "referrer_user_id" UUID NOT NULL,
  "referred_user_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONVERTED',
  "reward_points" BIGINT NOT NULL DEFAULT 0,
  "fraud_flag" BOOLEAN NOT NULL DEFAULT false,
  "converted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_codes_user_id_key" ON "referral_codes"("user_id");
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");
CREATE UNIQUE INDEX "customer_referrals_referred_user_id_key" ON "customer_referrals"("referred_user_id");
CREATE INDEX "customer_referrals_referrer_user_id_created_at_idx" ON "customer_referrals"("referrer_user_id", "created_at");
CREATE INDEX "customer_referrals_status_created_at_idx" ON "customer_referrals"("status", "created_at");

ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_referrals" ADD CONSTRAINT "customer_referrals_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_referrals" ADD CONSTRAINT "customer_referrals_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_referrals" ADD CONSTRAINT "customer_referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "notifications" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");

CREATE TABLE "chat_participants" (
  "thread_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "last_read_at" TIMESTAMPTZ(3),
  "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("thread_id", "user_id"),
  CONSTRAINT "chat_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "chat_participants_user_id_joined_at_idx" ON "chat_participants"("user_id", "joined_at");

CREATE TABLE "loyalty_accounts" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "points_balance" BIGINT NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_accounts_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "loyalty_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "loyalty_accounts_points_nonnegative" CHECK ("points_balance" >= 0)
);

CREATE TABLE "loyalty_transactions" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "points" BIGINT NOT NULL,
  "entry_type" TEXT NOT NULL,
  "reference_type" TEXT NOT NULL,
  "reference_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_transactions_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "loyalty_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "loyalty_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "loyalty_transactions_points_nonzero" CHECK ("points" <> 0)
);
CREATE INDEX "loyalty_transactions_account_id_created_at_idx" ON "loyalty_transactions"("account_id", "created_at");

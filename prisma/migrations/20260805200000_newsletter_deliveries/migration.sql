CREATE TABLE "newsletter_deliveries" (
    "id" UUID NOT NULL,
    "broadcast_id" UUID NOT NULL,
    "subscriber_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "provider_ref" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "attempted_at" TIMESTAMPTZ(3),
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "newsletter_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "newsletter_deliveries_broadcast_id_subscriber_id_key" ON "newsletter_deliveries"("broadcast_id", "subscriber_id");
CREATE INDEX "newsletter_deliveries_status_created_at_idx" ON "newsletter_deliveries"("status", "created_at");
ALTER TABLE "newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "newsletter_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "newsletter_subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

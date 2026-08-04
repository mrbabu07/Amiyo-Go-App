CREATE TABLE "newsletter_subscribers" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'app',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "unsubscribe_token" UUID NOT NULL,
  "unsubscribed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");
CREATE UNIQUE INDEX "newsletter_subscribers_unsubscribe_token_key" ON "newsletter_subscribers"("unsubscribe_token");
CREATE INDEX "newsletter_subscribers_active_created_at_idx" ON "newsletter_subscribers"("active", "created_at");

CREATE TABLE "newsletter_broadcasts" (
  "id" UUID NOT NULL,
  "subject" TEXT NOT NULL,
  "preview_text" TEXT,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "scheduled_at" TIMESTAMPTZ(3),
  "recipient_count" INTEGER NOT NULL DEFAULT 0,
  "sent_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "open_count" INTEGER NOT NULL DEFAULT 0,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "newsletter_broadcasts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "newsletter_broadcasts_status_scheduled_at_created_at_idx" ON "newsletter_broadcasts"("status", "scheduled_at", "created_at");

CREATE TABLE "platform_configurations" (
  "key" TEXT NOT NULL,
  "feature_flags" JSONB NOT NULL,
  "payment_methods" JSONB NOT NULL,
  "maintenance_mode" JSONB NOT NULL,
  "return_policy" JSONB NOT NULL,
  "tax" JSONB NOT NULL,
  "seo" JSONB NOT NULL,
  "notification_controls" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_by" UUID,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "platform_configurations_pkey" PRIMARY KEY ("key")
);

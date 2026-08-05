CREATE TABLE "delivery_settings" (
  "key" TEXT NOT NULL DEFAULT 'default',
  "standard_charge_minor" BIGINT NOT NULL DEFAULT 10000,
  "free_delivery_enabled" BOOLEAN NOT NULL DEFAULT true,
  "free_delivery_threshold_minor" BIGINT NOT NULL DEFAULT 1100000,
  "base_division" TEXT NOT NULL DEFAULT 'Chattogram',
  "base_district" TEXT NOT NULL DEFAULT 'Cox''s Bazar',
  "base_upazila" TEXT NOT NULL DEFAULT 'Teknaf',
  "base_union" TEXT NOT NULL DEFAULT 'Hnila',
  "same_union_fee_minor" BIGINT NOT NULL DEFAULT 6000,
  "same_upazila_fee_minor" BIGINT NOT NULL DEFAULT 8000,
  "same_district_fee_minor" BIGINT NOT NULL DEFAULT 12000,
  "outside_district_fee_minor" BIGINT NOT NULL DEFAULT 15000,
  "estimated_min_days" INTEGER NOT NULL DEFAULT 2,
  "estimated_max_days" INTEGER NOT NULL DEFAULT 5,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "delivery_settings_pkey" PRIMARY KEY ("key")
);
INSERT INTO "delivery_settings" ("key", "updated_at") VALUES ('default', CURRENT_TIMESTAMP);

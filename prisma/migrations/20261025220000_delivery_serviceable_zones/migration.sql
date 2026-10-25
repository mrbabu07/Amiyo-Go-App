ALTER TABLE "delivery_settings"
  ADD COLUMN "same_union_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "same_upazila_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "same_district_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "outside_district_enabled" BOOLEAN NOT NULL DEFAULT true;

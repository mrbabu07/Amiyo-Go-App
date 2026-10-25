ALTER TABLE "delivery_settings"
  ADD COLUMN "open_box_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "inspection_minutes" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "orders"
  ADD COLUMN "open_box_allowed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "inspection_minutes" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "delivery_settings"
  ADD CONSTRAINT "delivery_settings_inspection_minutes_check"
  CHECK ("inspection_minutes" BETWEEN 1 AND 30);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_inspection_minutes_check"
  CHECK ("inspection_minutes" BETWEEN 0 AND 30);

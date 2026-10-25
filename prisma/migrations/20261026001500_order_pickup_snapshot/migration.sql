ALTER TABLE "orders"
ADD COLUMN "fulfillment_method" TEXT NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN "pickup_point_snapshot" JSONB;

ALTER TABLE "orders"
ADD CONSTRAINT "orders_fulfillment_method_check"
CHECK ("fulfillment_method" IN ('DELIVERY', 'PICKUP'));

ALTER TABLE "orders"
ADD CONSTRAINT "orders_pickup_snapshot_check"
CHECK (("fulfillment_method" = 'PICKUP' AND "pickup_point_snapshot" IS NOT NULL) OR ("fulfillment_method" = 'DELIVERY' AND "pickup_point_snapshot" IS NULL));

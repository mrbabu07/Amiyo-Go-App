ALTER TABLE "refunds" ADD COLUMN "vendor_order_id" UUID;

CREATE UNIQUE INDEX "refunds_vendor_order_id_key" ON "refunds"("vendor_order_id");

ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_vendor_order_id_fkey"
FOREIGN KEY ("vendor_order_id") REFERENCES "vendor_orders"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

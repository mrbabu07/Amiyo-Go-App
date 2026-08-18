ALTER TABLE "commission_rules" ADD COLUMN "shop_id" UUID;
ALTER TABLE "commission_rules" ADD COLUMN "product_id" UUID;

ALTER TABLE "commission_rules"
  ADD CONSTRAINT "commission_rules_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "vendor_shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_rules"
  ADD CONSTRAINT "commission_rules_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "commission_rules_vendor_id_shop_id_category_id_product_id_effective_from_idx"
  ON "commission_rules"("vendor_id", "shop_id", "category_id", "product_id", "effective_from");

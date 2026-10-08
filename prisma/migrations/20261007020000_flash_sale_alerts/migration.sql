CREATE TABLE "flash_sale_alerts" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "flash_sale_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "flash_sale_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "flash_sale_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "flash_sale_alerts_user_id_product_id_key" ON "flash_sale_alerts"("user_id", "product_id");
CREATE INDEX "flash_sale_alerts_active_id_idx" ON "flash_sale_alerts"("active", "id");

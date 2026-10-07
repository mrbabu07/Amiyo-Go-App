BEGIN;

CREATE UNIQUE INDEX "stock_alerts_stock_user_product_key"
ON "stock_alerts" ("user_id", "product_id") WHERE "target_minor" IS NULL;

CREATE UNIQUE INDEX "stock_alerts_price_user_product_key"
ON "stock_alerts" ("user_id", "product_id") WHERE "target_minor" IS NOT NULL;

DROP INDEX "stock_alerts_user_id_product_id_key";

COMMIT;

CREATE TABLE "shop_follows" (
    "user_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_follows_pkey" PRIMARY KEY ("user_id", "shop_id")
);

CREATE INDEX "shop_follows_shop_id_created_at_idx" ON "shop_follows"("shop_id", "created_at");

ALTER TABLE "shop_follows" ADD CONSTRAINT "shop_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_follows" ADD CONSTRAINT "shop_follows_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "vendor_shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

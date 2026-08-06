ALTER TABLE "reviews"
ADD COLUMN "vendor_reply" TEXT,
ADD COLUMN "vendor_replied_at" TIMESTAMPTZ(3);

CREATE TABLE "vendor_category_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "vendor_id" UUID NOT NULL, "category_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', "reason" TEXT NOT NULL, "description" TEXT,
  "reviewed_by" UUID, "reviewed_at" TIMESTAMPTZ(3), "review_reason" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "vendor_category_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vendor_category_requests_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "vendor_category_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "vendor_category_requests_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'))
);
CREATE UNIQUE INDEX "vendor_category_requests_vendor_id_category_id_key" ON "vendor_category_requests"("vendor_id", "category_id");
CREATE INDEX "vendor_category_requests_status_created_at_idx" ON "vendor_category_requests"("status", "created_at");

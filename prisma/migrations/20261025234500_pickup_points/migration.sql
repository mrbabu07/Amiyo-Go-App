CREATE TABLE "pickup_points" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "division" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "upazila" TEXT NOT NULL,
  "union_name" TEXT NOT NULL,
  "instructions" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "pickup_points_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pickup_points_version_check" CHECK ("version" > 0)
);

CREATE INDEX "pickup_points_active_district_upazila_idx" ON "pickup_points"("active", "district", "upazila");

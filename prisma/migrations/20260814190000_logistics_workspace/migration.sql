CREATE TABLE "logistics_zones" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "districts" JSONB NOT NULL DEFAULT '[]',
  "courier_partner_ids" JSONB NOT NULL DEFAULT '[]',
  "default_courier_name" TEXT,
  "cod_available" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'active',
  "sla_hours" INTEGER NOT NULL DEFAULT 48,
  "sort_order" INTEGER NOT NULL DEFAULT 100,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "logistics_zones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courier_partners" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "booking_mode" TEXT NOT NULL DEFAULT 'manual',
  "coverage_type" TEXT NOT NULL DEFAULT 'outside_district',
  "outside_district" BOOLEAN NOT NULL DEFAULT true,
  "local_area" BOOLEAN NOT NULL DEFAULT false,
  "instant_delivery" BOOLEAN NOT NULL DEFAULT false,
  "tracking_url_pattern" TEXT,
  "contact_name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "service_zones" JSONB NOT NULL DEFAULT '[]',
  "cod_supported" BOOLEAN NOT NULL DEFAULT true,
  "base_delivery_cost_minor" BIGINT NOT NULL DEFAULT 8000,
  "cod_collection_fee_minor" BIGINT NOT NULL DEFAULT 1000,
  "default_sla_hours" INTEGER NOT NULL DEFAULT 72,
  "sla_zone_code" TEXT,
  "sla_processing_hours" INTEGER NOT NULL DEFAULT 24,
  "sla_delivery_days_min" INTEGER NOT NULL DEFAULT 1,
  "sla_delivery_days_max" INTEGER NOT NULL DEFAULT 3,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "courier_partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pickup_staff" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "user_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'active',
  "route_name" TEXT,
  "assigned_zones" JSONB NOT NULL DEFAULT '[]',
  "assigned_locations" JSONB NOT NULL DEFAULT '[]',
  "assigned_vendor_ids" JSONB NOT NULL DEFAULT '[]',
  "vehicle_type" TEXT NOT NULL DEFAULT 'bike',
  "capacity_orders" INTEGER NOT NULL DEFAULT 25,
  "shift_start" TEXT NOT NULL DEFAULT '09:00',
  "shift_end" TEXT NOT NULL DEFAULT '18:00',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "pickup_staff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_fee_rules" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "rule_type" TEXT NOT NULL DEFAULT 'zone_rate',
  "status" TEXT NOT NULL DEFAULT 'active',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "zone_code" TEXT,
  "min_order_amount_minor" BIGINT NOT NULL DEFAULT 0,
  "max_order_amount_minor" BIGINT NOT NULL DEFAULT 0,
  "min_weight_grams" INTEGER NOT NULL DEFAULT 0,
  "max_weight_grams" INTEGER NOT NULL DEFAULT 0,
  "base_fee_minor" BIGINT NOT NULL DEFAULT 8000,
  "per_item_fee_minor" BIGINT NOT NULL DEFAULT 0,
  "fee_per_kg_minor" BIGINT NOT NULL DEFAULT 1000,
  "cod_fee_minor" BIGINT NOT NULL DEFAULT 0,
  "redelivery_fee_minor" BIGINT NOT NULL DEFAULT 0,
  "free_shipping_threshold_minor" BIGINT NOT NULL DEFAULT 0,
  "payment_methods" JSONB NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "delivery_fee_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistics_assignments" (
  "id" UUID NOT NULL,
  "shipment_id" UUID NOT NULL,
  "courier_partner_id" UUID,
  "pickup_staff_id" UUID,
  "booking_mode" TEXT NOT NULL DEFAULT 'manual',
  "tracking_number" TEXT,
  "pickup_date" TIMESTAMPTZ(3),
  "pickup_window" TEXT,
  "estimated_delivery_date" TIMESTAMPTZ(3),
  "note" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "logistics_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cod_remittances" (
  "id" UUID NOT NULL,
  "courier_partner_id" UUID,
  "courier_name" TEXT NOT NULL,
  "collected_amount_minor" BIGINT NOT NULL,
  "remitted_amount_minor" BIGINT NOT NULL,
  "forwarded_to_vendor_minor" BIGINT NOT NULL DEFAULT 0,
  "reference" TEXT,
  "notes" TEXT,
  "order_ids" JSONB NOT NULL DEFAULT '[]',
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cod_remittances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "failed_delivery_records" (
  "id" UUID NOT NULL,
  "shipment_id" UUID NOT NULL,
  "courier_name" TEXT,
  "reason" TEXT NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 1,
  "next_attempt_at" TIMESTAMPTZ(3),
  "redelivery_fee_minor" BIGINT NOT NULL DEFAULT 0,
  "return_fee_minor" BIGINT NOT NULL DEFAULT 0,
  "resolution" TEXT NOT NULL DEFAULT 'pending',
  "note" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "failed_delivery_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "logistics_zones_code_key" ON "logistics_zones"("code");
CREATE INDEX "logistics_zones_status_sort_order_idx" ON "logistics_zones"("status", "sort_order");
CREATE UNIQUE INDEX "courier_partners_code_key" ON "courier_partners"("code");
CREATE INDEX "courier_partners_status_name_idx" ON "courier_partners"("status", "name");
CREATE INDEX "pickup_staff_status_name_idx" ON "pickup_staff"("status", "name");
CREATE INDEX "pickup_staff_user_id_idx" ON "pickup_staff"("user_id");
CREATE INDEX "delivery_fee_rules_status_priority_idx" ON "delivery_fee_rules"("status", "priority");
CREATE UNIQUE INDEX "logistics_assignments_shipment_id_key" ON "logistics_assignments"("shipment_id");
CREATE INDEX "logistics_assignments_courier_partner_id_pickup_date_idx" ON "logistics_assignments"("courier_partner_id", "pickup_date");
CREATE INDEX "logistics_assignments_pickup_staff_id_pickup_date_idx" ON "logistics_assignments"("pickup_staff_id", "pickup_date");
CREATE INDEX "cod_remittances_courier_partner_id_created_at_idx" ON "cod_remittances"("courier_partner_id", "created_at");
CREATE UNIQUE INDEX "failed_delivery_records_shipment_id_key" ON "failed_delivery_records"("shipment_id");
CREATE INDEX "failed_delivery_records_resolution_next_attempt_at_idx" ON "failed_delivery_records"("resolution", "next_attempt_at");

ALTER TABLE "logistics_assignments" ADD CONSTRAINT "logistics_assignments_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "logistics_assignments" ADD CONSTRAINT "logistics_assignments_courier_partner_id_fkey" FOREIGN KEY ("courier_partner_id") REFERENCES "courier_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "logistics_assignments" ADD CONSTRAINT "logistics_assignments_pickup_staff_id_fkey" FOREIGN KEY ("pickup_staff_id") REFERENCES "pickup_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cod_remittances" ADD CONSTRAINT "cod_remittances_courier_partner_id_fkey" FOREIGN KEY ("courier_partner_id") REFERENCES "courier_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "failed_delivery_records" ADD CONSTRAINT "failed_delivery_records_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

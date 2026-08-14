ALTER TABLE "shipments"
  ADD COLUMN "cod_state" TEXT NOT NULL DEFAULT 'cod_pending',
  ADD COLUMN "cod_remittance_reference" TEXT,
  ADD COLUMN "cod_dispute_reason" TEXT,
  ADD COLUMN "rto_received_at" TIMESTAMPTZ(3);

CREATE INDEX "shipments_cod_state_updated_at_idx" ON "shipments"("cod_state", "updated_at");

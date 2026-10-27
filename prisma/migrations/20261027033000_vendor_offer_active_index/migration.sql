CREATE INDEX "vouchers_owner_type_active_starts_at_ends_at_idx"
ON "vouchers"("owner_type", "active", "starts_at", "ends_at");

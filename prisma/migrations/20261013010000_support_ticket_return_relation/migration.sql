ALTER TABLE "support_tickets"
ADD COLUMN "return_id" UUID;

CREATE INDEX "support_tickets_return_id_updated_at_idx"
ON "support_tickets"("return_id", "updated_at");

ALTER TABLE "support_tickets"
ADD CONSTRAINT "support_tickets_return_id_fkey"
FOREIGN KEY ("return_id") REFERENCES "returns"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

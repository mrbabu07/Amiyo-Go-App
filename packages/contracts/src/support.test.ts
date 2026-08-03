import assert from "node:assert/strict";
import test from "node:test";
import { createSupportTicketSchema, supportTicketStatusInputSchema } from "./support.js";

test("support ticket input normalizes text and defaults priority", () => {
  const parsed = createSupportTicketSchema.parse({ subject: "  Delivery is late  ", category: "DELIVERY", message: "  Please check my shipment  " });
  assert.equal(parsed.subject, "Delivery is late");
  assert.equal(parsed.message, "Please check my shipment");
  assert.equal(parsed.priority, "normal");
});

test("support status accepts only workflow states", () => {
  assert.equal(supportTicketStatusInputSchema.parse({ status: "resolved" }).status, "resolved");
  assert.throws(() => supportTicketStatusInputSchema.parse({ status: "deleted" }));
});

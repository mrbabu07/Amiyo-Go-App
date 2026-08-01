import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { DeliveryCallbackService } from "./delivery-callback.service.js";

test("delivery callback verification rejects replayed or invalid signatures", () => {
  const previous = { ...process.env }; process.env.AMIYO_DELIVERY_CALLBACK_API_SECRET = "callback-api-key"; process.env.AMIYO_DELIVERY_CALLBACK_SECRET = "callback-secret";
  try {
    const raw = Buffer.from('{"eventId":"event-1"}'); const timestamp = Math.floor(Date.now() / 1000).toString(); const signature = `sha256=${createHmac("sha256", "callback-secret").update(`${timestamp}.${raw.toString("utf8")}`).digest("hex")}`;
    const service = new DeliveryCallbackService({} as PrismaClient);
    assert.doesNotThrow(() => service.verify(raw, { apiKey: "callback-api-key", timestamp, signature }));
    assert.throws(() => service.verify(raw, { apiKey: "callback-api-key", timestamp, signature: "sha256=bad" }));
  } finally { process.env = previous; }
});

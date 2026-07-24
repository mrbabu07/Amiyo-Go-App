import { randomUUID } from "node:crypto";

export const correlationHeader = "x-correlation-id";

export function createCorrelationId(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || randomUUID();
  return value || randomUUID();
}

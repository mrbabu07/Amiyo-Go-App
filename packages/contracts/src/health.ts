import { z } from "zod";

export const healthResponseSchema = z.object({
  service: z.string(),
  status: z.enum(["ok", "degraded", "not_ready"]),
  version: z.string(),
  checkedAt: z.string().datetime()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

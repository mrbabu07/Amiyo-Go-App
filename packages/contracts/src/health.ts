import { z } from "./zod.js";

export const healthResponseSchema = z.object({
  service: z.string(),
  status: z.enum(["ok", "degraded", "not_ready"]),
  version: z.string(),
  release: z.union([z.literal("unknown"), z.string().regex(/^[a-f0-9]{7,64}$/)]),
  checkedAt: z.string().datetime()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

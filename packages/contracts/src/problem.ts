import { z } from "zod";

export const problemSchema = z.object({
  type: z.string().url().default("https://api.amiyo-go.local/problems/internal-error"),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  code: z.string(),
  correlationId: z.string().optional()
});

export type Problem = z.infer<typeof problemSchema>;

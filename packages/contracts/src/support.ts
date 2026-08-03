import { z } from "zod";
import { timestampSchema, uuidSchema } from "./common.js";

export const supportCategorySchema = z.enum(["ORDER", "DELIVERY", "PAYMENT", "RETURN", "ACCOUNT", "PRODUCT", "OTHER"]);
export const supportPrioritySchema = z.enum(["normal", "high", "urgent"]);
export const supportStatusSchema = z.enum(["open", "in_progress", "resolved", "closed"]);

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: supportCategorySchema,
  priority: supportPrioritySchema.default("normal"),
  orderId: uuidSchema.nullable().optional(),
  message: z.string().trim().min(5).max(3000)
});

export const supportMessageInputSchema = z.object({ body: z.string().trim().min(1).max(3000) });
export const supportTicketStatusInputSchema = z.object({
  status: supportStatusSchema,
  note: z.string().trim().min(1).max(3000).optional()
});

export const supportMessageSchema = z.object({
  id: uuidSchema,
  senderId: uuidSchema,
  body: z.string(),
  createdAt: timestampSchema
});

export const supportTicketSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  orderId: uuidSchema.nullable(),
  subject: z.string(),
  category: supportCategorySchema,
  priority: supportPrioritySchema,
  status: supportStatusSchema,
  assignedTo: uuidSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  messages: z.array(supportMessageSchema)
});

export type CreateSupportTicket = z.infer<typeof createSupportTicketSchema>;
export type SupportMessageInput = z.infer<typeof supportMessageInputSchema>;
export type SupportTicketStatusInput = z.infer<typeof supportTicketStatusInputSchema>;
export type SupportTicket = z.infer<typeof supportTicketSchema>;

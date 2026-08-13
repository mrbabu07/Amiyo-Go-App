import { z } from "zod";
import { timestampSchema, uuidSchema } from "./common.js";

const minorSchema = z.string().regex(/^\d+$/, "Must be a non-negative integer minor-unit amount");

const commissionRuleInputObject = z.object({
  vendorId: uuidSchema.nullable().default(null),
  categoryId: uuidSchema.nullable().default(null),
  rateBps: z.number().int().min(0).max(5000),
  fixedMinor: minorSchema.default("0"),
  currency: z.literal("BDT").default("BDT"),
  effectiveFrom: timestampSchema,
  effectiveTo: timestampSchema.nullable().default(null)
});

const validCommission = <Schema extends z.ZodTypeAny>(schema: Schema) => schema.refine((value: z.infer<Schema>) => value.rateBps > 0 || BigInt(value.fixedMinor) > 0n, { message: "A percentage or fixed commission is required", path: ["rateBps"] }).refine((value: z.infer<Schema>) => !value.effectiveTo || value.effectiveFrom < value.effectiveTo, { message: "effectiveFrom must precede effectiveTo", path: ["effectiveTo"] });

export const commissionRuleInputSchema = validCommission(commissionRuleInputObject);
export const updateCommissionRuleSchema = validCommission(commissionRuleInputObject.extend({ expectedVersion: z.number().int().positive() }));
export const endCommissionRuleSchema = z.object({ expectedVersion: z.number().int().positive() });

export const commissionRuleSchema = commissionRuleInputObject.extend({
  id: uuidSchema,
  vendorName: z.string().nullable(),
  categoryName: z.string().nullable(),
  scope: z.enum(["GLOBAL", "CATEGORY", "VENDOR", "VENDOR_CATEGORY"]),
  status: z.enum(["SCHEDULED", "ACTIVE", "ENDED"]),
  version: z.number().int().positive()
});

export type CommissionRuleInput = z.infer<typeof commissionRuleInputSchema>;
export type UpdateCommissionRule = z.infer<typeof updateCommissionRuleSchema>;
export type CommissionRule = z.infer<typeof commissionRuleSchema>;

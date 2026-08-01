import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const isoCurrencySchema = z.string().length(3).transform((value) => value.toUpperCase());
export const minorUnitSchema = z.string().regex(/^\d+$/, "Minor units must be a non-negative integer string");

export const moneySchema = z.object({
  amountMinor: minorUnitSchema,
  currency: isoCurrencySchema.default("BDT")
});

export const versionSchema = z.number().int().positive();
export const timestampSchema = z.string().datetime({ offset: true });

export type Money = z.infer<typeof moneySchema>;

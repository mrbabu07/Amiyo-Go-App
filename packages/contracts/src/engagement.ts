import { z } from "zod";
import { moneySchema, timestampSchema, uuidSchema } from "./common.js";

export const wishlistSchema = z.object({ id: uuidSchema, name: z.string(), isDefault: z.boolean(), shareUrl: z.string().url().nullable(), items: z.array(z.object({ productId: uuidSchema, name: z.string(), slug: z.string(), thumbnailUrl: z.string().url().nullable(), price: moneySchema.nullable(), addedAt: timestampSchema })) });
export const wishlistItemInputSchema = z.object({ productId: uuidSchema });
export const stockAlertInputSchema = z.object({ productId: uuidSchema, targetMinor: z.string().regex(/^\d+$/).nullable().optional() });

export const reviewInputSchema = z.object({ orderItemId: uuidSchema, rating: z.number().int().min(1).max(5), title: z.string().trim().max(120).nullable().optional(), body: z.string().trim().min(3).max(2000).nullable().optional() });
export const reviewSchema = z.object({ id: uuidSchema, productId: uuidSchema, rating: z.number().int().min(1).max(5), title: z.string().nullable(), body: z.string().nullable(), verifiedPurchase: z.boolean(), authorName: z.string(), createdAt: timestampSchema });
export const questionInputSchema = z.object({ body: z.string().trim().min(5).max(1000) });
export const answerInputSchema = z.object({ body: z.string().trim().min(2).max(2000) });
export const questionSchema = z.object({ id: uuidSchema, productId: uuidSchema, body: z.string(), status: z.string(), authorName: z.string(), createdAt: timestampSchema, answers: z.array(z.object({ id: uuidSchema, body: z.string(), accepted: z.boolean(), authorName: z.string(), createdAt: timestampSchema })) });

export const notificationSchema = z.object({ id: uuidSchema, type: z.string(), title: z.string(), body: z.string(), href: z.string().nullable(), readAt: timestampSchema.nullable(), createdAt: timestampSchema });
export const chatThreadInputSchema = z.object({ vendorId: uuidSchema, subject: z.string().trim().min(2).max(160) });
export const chatMessageInputSchema = z.object({ body: z.string().trim().min(1).max(3000) });
export const chatThreadSchema = z.object({ id: uuidSchema, vendorId: uuidSchema.nullable(), subject: z.string().nullable(), status: z.string(), updatedAt: timestampSchema, messages: z.array(z.object({ id: uuidSchema, senderId: uuidSchema, body: z.string(), createdAt: timestampSchema })) });

export const promotionEffectSchema = z.discriminatedUnion("type", [z.object({ type: z.literal("FIXED"), amountMinor: z.string().regex(/^\d+$/) }), z.object({ type: z.literal("PERCENT"), rateBps: z.number().int().min(0).max(10_000), maxDiscountMinor: z.string().regex(/^\d+$/).nullable().optional() })]);
export const promotionCandidateSchema = z.object({ id: uuidSchema, priority: z.number().int(), minimumSubtotalMinor: z.string().regex(/^\d+$/).default("0"), effect: promotionEffectSchema });
export const createPromotionSchema = z.object({ name: z.string().trim().min(2).max(160), priority: z.number().int().default(0), startsAt: z.string().datetime(), endsAt: z.string().datetime(), candidate: promotionCandidateSchema.omit({ id: true, priority: true }) }).refine((value) => value.startsAt < value.endsAt, "startsAt must precede endsAt");
export const growthFeedSchema = z.object({ coupons: z.array(z.object({ id: uuidSchema, code: z.string(), discountType: z.string(), value: z.number().int(), minimumSpend: moneySchema, startsAt: timestampSchema, endsAt: timestampSchema })), campaigns: z.array(z.object({ id: uuidSchema, name: z.string(), slug: z.string(), href: z.string(), startsAt: timestampSchema, endsAt: timestampSchema })), flashSales: z.array(z.object({ id: uuidSchema, name: z.string(), href: z.string(), startsAt: timestampSchema, endsAt: timestampSchema, products: z.array(z.object({ productId: uuidSchema, price: moneySchema, quantityRemaining: z.number().int().nonnegative().nullable() })) })) });

export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type AnswerInput = z.infer<typeof answerInputSchema>;
export type ChatThreadInput = z.infer<typeof chatThreadInputSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;
export type PromotionCandidate = z.infer<typeof promotionCandidateSchema>;
export type CreatePromotion = z.infer<typeof createPromotionSchema>;

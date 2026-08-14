import { z } from "zod";
import { timestampSchema, uuidSchema, versionSchema } from "./common.js";

export const adminUserSchema = z.object({ id: uuidSchema, email: z.string().nullable(), phone: z.string().nullable(), displayName: z.string().nullable(), status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "ANONYMIZED"]), roles: z.array(z.string()), createdAt: timestampSchema });
export const adminUserStatusInputSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]), reason: z.string().trim().min(3).max(500) });
export const adminAssignableRoleSchema = z.enum(["SUPPORT_AGENT", "FINANCE_ADMIN", "OPERATIONS_ADMIN", "SUPER_ADMIN"]);
export const adminUserRolesInputSchema = z.object({ roles: z.array(adminAssignableRoleSchema).max(4), reason: z.string().trim().min(3).max(500) }).superRefine((value, context) => { if (new Set(value.roles).size !== value.roles.length) context.addIssue({ code: "custom", message: "Roles must be unique", path: ["roles"] }); });
export const adminVendorSchema = z.object({ id: uuidSchema, legalName: z.string(), displayName: z.string(), status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]), version: versionSchema, memberCount: z.number().int().nonnegative(), shopCount: z.number().int().nonnegative(), latestKycStatus: z.string().nullable(), createdAt: timestampSchema });
export const adminVendorStatusInputSchema = z.object({ status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]), reason: z.string().trim().min(3).max(500) });
export const adminKycSubmissionSchema = z.object({ id: uuidSchema, vendorId: uuidSchema, vendorName: z.string(), status: z.enum(["DRAFT", "SUBMITTED", "REVIEWING", "APPROVED", "REJECTED"]), submittedAt: timestampSchema.nullable(), rejectionReason: z.string().nullable(), documents: z.array(z.object({ id: uuidSchema, documentType: z.string(), storageKey: z.string(), mimeType: z.string() })) });
export const adminKycReviewInputSchema = z.object({ status: z.enum(["REVIEWING", "APPROVED", "REJECTED"]), reason: z.string().trim().min(3).max(500).optional() }).refine((value) => value.status !== "REJECTED" || Boolean(value.reason), "A rejection reason is required");
export const trustCaseSchema = z.object({ id: uuidSchema, subjectType: z.string(), subjectId: z.string(), caseType: z.string(), severity: z.string(), status: z.string(), assignedTo: uuidSchema.nullable(), summary: z.string(), createdAt: timestampSchema, actions: z.array(z.object({ id: uuidSchema, actionType: z.string(), actorUserId: uuidSchema, reason: z.string(), createdAt: timestampSchema })) });
export const trustCaseActionInputSchema = z.object({ action: z.enum(["INVESTIGATE", "RESOLVE", "CLOSE"]), reason: z.string().trim().min(3).max(1000) });
export const adminWorkspaceSchema = z.object({ users: z.array(adminUserSchema), vendors: z.array(adminVendorSchema), kyc: z.array(adminKycSubmissionSchema), trustCases: z.array(trustCaseSchema) });
const adminOrderMoneySchema = z.object({ amountMinor: z.string().regex(/^\d+$/), currency: z.string().length(3) });
export const adminOrderDetailSchema = z.object({
  id: uuidSchema,
  orderNumber: z.string(),
  status: z.string(),
  version: versionSchema,
  createdAt: timestampSchema,
  placedAt: timestampSchema.nullable(),
  customer: z.object({ id: uuidSchema.nullable(), displayName: z.string(), email: z.string().nullable(), phone: z.string().nullable() }),
  deliveryAddress: z.object({ recipientName: z.string(), phone: z.string(), line1: z.string(), line2: z.string().nullable(), division: z.string(), district: z.string(), upazila: z.string().nullable(), unionName: z.string().nullable(), postalCode: z.string().nullable() }).nullable(),
  payment: z.object({ id: uuidSchema, provider: z.string(), method: z.string(), status: z.string(), amount: adminOrderMoneySchema, refunded: adminOrderMoneySchema, transactionId: z.string().nullable(), createdAt: timestampSchema }).nullable(),
  invoice: z.object({ id: uuidSchema, number: z.string(), issuedAt: timestampSchema, storageUrl: z.string().url().nullable() }).nullable(),
  subtotal: adminOrderMoneySchema,
  discount: adminOrderMoneySchema,
  delivery: adminOrderMoneySchema,
  tax: adminOrderMoneySchema,
  total: adminOrderMoneySchema,
  events: z.array(z.object({ id: uuidSchema, fromStatus: z.string().nullable(), toStatus: z.string(), actorType: z.string(), reason: z.string().nullable(), createdAt: timestampSchema })),
  vendorOrders: z.array(z.object({
    id: uuidSchema,
    vendorId: uuidSchema,
    vendorName: z.string(),
    shopName: z.string(),
    status: z.string(),
    version: versionSchema,
    subtotal: adminOrderMoneySchema,
    discount: adminOrderMoneySchema,
    delivery: adminOrderMoneySchema,
    total: adminOrderMoneySchema,
    commission: adminOrderMoneySchema,
    shipment: z.object({ status: z.string(), provider: z.string().nullable(), trackingNumber: z.string().nullable() }).nullable(),
    items: z.array(z.object({ id: uuidSchema, productName: z.string(), sku: z.string(), quantity: z.number().int().positive(), unitPrice: adminOrderMoneySchema, lineTotal: adminOrderMoneySchema }))
  }))
});
export const paymentVerificationSchema = z.object({ id: uuidSchema, paymentId: uuidSchema, orderId: uuidSchema, orderNumber: z.string(), provider: z.string(), amountMinor: z.string(), currency: z.string(), status: z.string(), transactionRef: z.string(), senderMasked: z.string().nullable(), evidenceStorageKey: z.string().nullable(), createdAt: timestampSchema });
export const paymentVerificationReviewSchema = z.object({ status: z.enum(["approved", "rejected"]), reason: z.string().trim().min(3).max(500) });
export const adminCategoryInputSchema = z.object({ parentId: uuidSchema.nullable().optional(), name: z.string().trim().min(2).max(120), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().max(1000).nullable().optional(), displayOrder: z.number().int().default(0) });
export const adminCategoryAttributeSchema = z.object({ id: uuidSchema, key: z.string(), label: z.string(), dataType: z.enum(["text", "number", "boolean", "select", "multiselect"]), required: z.boolean(), filterable: z.boolean(), displayOrder: z.number().int(), options: z.array(z.object({ id: uuidSchema, value: z.string(), label: z.string(), displayOrder: z.number().int() })) });
const adminCategoryAttributeInputSchema = z.object({ key: z.string().trim().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/), label: z.string().trim().min(1).max(120), dataType: z.enum(["text", "number", "boolean", "select", "multiselect"]), required: z.boolean().default(false), filterable: z.boolean().default(false), displayOrder: z.number().int().nonnegative().default(0), options: z.array(z.string().trim().min(1).max(100)).max(100).default([]) }).superRefine((value, context) => { const normalized = value.options.map((option) => option.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); if (normalized.some((option) => !option)) context.addIssue({ code: "custom", message: "Attribute options require a URL-safe value", path: ["options"] }); if (new Set(normalized).size !== normalized.length) context.addIssue({ code: "custom", message: "Attribute options must be unique", path: ["options"] }); if ((value.dataType === "select" || value.dataType === "multiselect") && value.options.length === 0) context.addIssue({ code: "custom", message: "Select attributes require options", path: ["options"] }); if (value.dataType !== "select" && value.dataType !== "multiselect" && value.options.length > 0) context.addIssue({ code: "custom", message: "Only select attributes may define options", path: ["options"] }); });
export const adminCategoryAttributesInputSchema = z.object({ attributes: z.array(adminCategoryAttributeInputSchema).max(100) }).superRefine((value, context) => { const keys = value.attributes.map((attribute) => attribute.key.toLowerCase()); if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", message: "Attribute keys must be unique", path: ["attributes"] }); });
export const adminToggleInputSchema = z.object({ active: z.boolean() });
export const adminBannerPlacementSchema = z.enum(["home_hero", "home_secondary", "category_banner", "shop_directory", "checkout_trust"]);
export const adminBannerInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(300).nullable().optional(),
  placement: adminBannerPlacementSchema,
  storageKey: z.string().trim().min(3).max(2000),
  mobileStorageKey: z.string().trim().min(3).max(2000).nullable().optional(),
  ctaLabel: z.string().trim().max(60).nullable().optional(),
  badgeText: z.string().trim().max(60).nullable().optional(),
  targetType: z.enum(["route", "url"]).nullable().optional(),
  targetValue: z.string().trim().max(2000).nullable().optional(),
  startsAt: timestampSchema,
  endsAt: timestampSchema,
  active: z.boolean().default(true),
  displayOrder: z.number().int().nonnegative().default(0)
}).superRefine((value, context) => {
  if (new Date(value.startsAt) >= new Date(value.endsAt)) context.addIssue({ code: "custom", message: "startsAt must precede endsAt", path: ["endsAt"] });
  if (value.targetType && !value.targetValue) context.addIssue({ code: "custom", message: "A target value is required", path: ["targetValue"] });
});
export const adminBannerSchema = z.object({ id: uuidSchema, title: z.string().nullable(), subtitle: z.string().nullable(), placement: adminBannerPlacementSchema, storageKey: z.string(), mobileStorageKey: z.string().nullable(), ctaLabel: z.string().nullable(), badgeText: z.string().nullable(), targetType: z.string().nullable(), targetValue: z.string().nullable(), startsAt: timestampSchema, endsAt: timestampSchema, active: z.boolean(), displayOrder: z.number().int().nonnegative(), imageUrl: z.string().url().nullable(), mobileImageUrl: z.string().url().nullable(), status: z.enum(["active", "scheduled", "inactive", "expired"]) });
export const adminCategoryRequestReviewSchema = z.object({ status: z.enum(["approved", "rejected"]), reason: z.string().trim().min(3).max(500) });
export const adminAnalyticsQuerySchema = z.object({ range: z.enum(["7d", "30d", "90d"]).default("30d") });
const analyticsAmountSchema = z.object({ amountMinor: z.string().regex(/^\d+$/), currency: z.literal("BDT") });
export const adminAnalyticsSchema = z.object({
  range: z.object({ key: z.enum(["7d", "30d", "90d"]), startsAt: timestampSchema, endsAt: timestampSchema }),
  summary: z.object({ totalCustomers: z.number().int().nonnegative(), newCustomers: z.number().int().nonnegative(), purchasingCustomers: z.number().int().nonnegative(), orders: z.number().int().nonnegative(), gmv: analyticsAmountSchema, averageOrderValue: analyticsAmountSchema, repeatPurchaseRate: z.number().min(0).max(100) }),
  trend: z.array(z.object({ date: z.string(), orders: z.number().int().nonnegative(), revenue: analyticsAmountSchema })),
  segments: z.array(z.object({ key: z.enum(["new", "regular", "vip"]), customers: z.number().int().nonnegative(), orders: z.number().int().nonnegative(), revenue: analyticsAmountSchema })),
  topProducts: z.array(z.object({ id: uuidSchema, name: z.string(), quantity: z.number().int().nonnegative(), revenue: analyticsAmountSchema })),
  topVendors: z.array(z.object({ id: uuidSchema, name: z.string(), orders: z.number().int().nonnegative(), revenue: analyticsAmountSchema }))
});
export const adminPlatformSchema = z.object({
  paymentVerifications: z.array(paymentVerificationSchema),
  categories: z.array(z.object({ id: uuidSchema, parentId: uuidSchema.nullable(), name: z.string(), slug: z.string(), status: z.string(), displayOrder: z.number().int(), productCount: z.number().int().nonnegative(), attributes: z.array(adminCategoryAttributeSchema) })),
  banners: z.array(adminBannerSchema),
  vouchers: z.array(z.object({ id: uuidSchema, code: z.string(), ownerType: z.string(), active: z.boolean(), startsAt: timestampSchema, endsAt: timestampSchema })),
  flashSales: z.array(z.object({ id: uuidSchema, name: z.string(), status: z.string(), startsAt: timestampSchema, endsAt: timestampSchema, productCount: z.number().int().nonnegative() })),
  audit: z.array(z.object({ id: uuidSchema, actorType: z.string(), action: z.string(), resourceType: z.string(), resourceId: z.string(), createdAt: timestampSchema }))
});
export const adminVoucherInputSchema = z.object({ code: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()), discountType: z.enum(["PERCENT", "FIXED"]), value: z.number().int().positive(), minimumSpendMinor: z.string().regex(/^\d+$/).default("0"), usageLimit: z.number().int().positive().nullable().default(null), startsAt: timestampSchema, endsAt: timestampSchema, active: z.boolean().default(true) }).superRefine((value, context) => { if (new Date(value.startsAt) >= new Date(value.endsAt)) context.addIssue({ code: "custom", message: "startsAt must precede endsAt", path: ["endsAt"] }); if (value.discountType === "PERCENT" && value.value > 100) context.addIssue({ code: "custom", message: "Percentage discount cannot exceed 100", path: ["value"] }); });
export const adminFlashSaleInputSchema = z.object({ name: z.string().trim().min(3).max(120), startsAt: timestampSchema, endsAt: timestampSchema, status: z.enum(["draft", "active", "paused"]).default("draft"), products: z.array(z.object({ productId: uuidSchema, priceMinor: z.string().regex(/^\d+$/).refine((value) => BigInt(value) > 0n, "Flash price must be positive"), quantityLimit: z.number().int().positive().nullable() })).min(1).max(100) }).superRefine((value, context) => { if (new Date(value.startsAt) >= new Date(value.endsAt)) context.addIssue({ code: "custom", message: "startsAt must precede endsAt", path: ["endsAt"] }); if (new Set(value.products.map((product) => product.productId)).size !== value.products.length) context.addIssue({ code: "custom", message: "A product can only be added once", path: ["products"] }); });
export const adminMarketingSchema = z.object({ vouchers: z.array(z.object({ id: uuidSchema, code: z.string(), ownerType: z.string(), ownerId: z.string(), rules: z.record(z.unknown()), startsAt: timestampSchema, endsAt: timestampSchema, active: z.boolean(), version: versionSchema })), flashSales: z.array(z.object({ id: uuidSchema, name: z.string(), status: z.string(), startsAt: timestampSchema, endsAt: timestampSchema, version: versionSchema, products: z.array(z.object({ productId: uuidSchema, productName: z.string(), regularPriceMinor: z.string().regex(/^\d+$/), priceMinor: z.string().regex(/^\d+$/), quantityLimit: z.number().int().positive().nullable(), soldCount: z.number().int().nonnegative() })) })), products: z.array(z.object({ id: uuidSchema, name: z.string(), slug: z.string(), priceMinor: z.string().regex(/^\d+$/), currency: z.string().length(3) })) });
export const adminAuditQuerySchema = z.object({ search: z.string().trim().max(200).default(""), actorType: z.string().trim().max(60).default("all"), resourceType: z.string().trim().max(80).default("all"), module: z.enum(["all", "finance", "logistics", "platform", "products", "vendors"]).default("all"), severity: z.enum(["all", "critical", "warning", "ok"]).default("all"), action: z.string().trim().max(120).default(""), from: z.coerce.date().optional(), to: z.coerce.date().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) }).refine((value) => !value.from || !value.to || value.from <= value.to, "from must precede to");
export const adminAuditSchema = z.object({ logs: z.array(z.object({ id: uuidSchema, actor: z.object({ id: uuidSchema.nullable(), type: z.string(), email: z.string().nullable(), name: z.string().nullable() }), action: z.string(), resource: z.object({ type: z.string(), id: z.string() }), module: z.string(), severity: z.enum(["critical", "warning", "ok"]), correlationId: z.string().nullable(), ipHash: z.string().nullable(), before: z.unknown().nullable(), after: z.unknown().nullable(), metadata: z.unknown().nullable(), createdAt: timestampSchema })), summary: z.object({ total: z.number().int().nonnegative(), critical: z.number().int().nonnegative(), warning: z.number().int().nonnegative(), sensitive: z.number().int().nonnegative() }), pagination: z.object({ page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative(), totalPages: z.number().int().positive(), hasPreviousPage: z.boolean(), hasNextPage: z.boolean() }), facets: z.object({ actorTypes: z.array(z.string()), resourceTypes: z.array(z.string()) }) });

export type AdminUserStatusInput = z.infer<typeof adminUserStatusInputSchema>;
export type AdminUserRolesInput = z.infer<typeof adminUserRolesInputSchema>;
export type AdminVendorStatusInput = z.infer<typeof adminVendorStatusInputSchema>;
export type AdminKycReviewInput = z.infer<typeof adminKycReviewInputSchema>;
export type TrustCaseActionInput = z.infer<typeof trustCaseActionInputSchema>;
export type PaymentVerificationReview = z.infer<typeof paymentVerificationReviewSchema>;
export type AdminCategoryInput = z.infer<typeof adminCategoryInputSchema>;
export type AdminCategoryAttributesInput = z.infer<typeof adminCategoryAttributesInputSchema>;
export type AdminAnalyticsQuery = z.infer<typeof adminAnalyticsQuerySchema>;
export type AdminCategoryRequestReview = z.infer<typeof adminCategoryRequestReviewSchema>;
export type AdminAnalyticsDto = z.infer<typeof adminAnalyticsSchema>;
export type AdminBannerInput = z.infer<typeof adminBannerInputSchema>;
export type AdminBannerDto = z.infer<typeof adminBannerSchema>;
export type AdminOrderDetail = z.infer<typeof adminOrderDetailSchema>;
export type AdminVoucherInput = z.infer<typeof adminVoucherInputSchema>;
export type AdminFlashSaleInput = z.infer<typeof adminFlashSaleInputSchema>;
export type AdminMarketingDto = z.infer<typeof adminMarketingSchema>;
export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;
export type AdminAuditDto = z.infer<typeof adminAuditSchema>;

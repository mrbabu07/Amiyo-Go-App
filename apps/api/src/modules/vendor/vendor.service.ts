import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { CreateVendorCategoryRequest, CreateVendorVoucher, SaveVendorBankAccount, Session, SubmitVendorKyc, UpdateVendorShop, UpdateVendorStaff, VendorRegistration } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

function vendorId(session: Session) {
  const id = session.vendorMemberships[0]?.vendorId;
  if (session.status !== "ACTIVE" || !id || !session.permissions.includes("vendor:read")) throw new ApiProblem(403, "VENDOR_ACCESS_REQUIRED", "An active vendor membership is required");
  return id;
}

function requirePermission(session: Session, permission: string) {
  if (!session.permissions.includes(permission)) throw new ApiProblem(403, "VENDOR_PERMISSION_REQUIRED", `The ${permission} permission is required`);
}

function json(value: unknown) { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
function slug(value: string, userId: string) { const base = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "shop"; return `${base.slice(0, 100)}-${userId.replaceAll("-", "")}`; }
function mask(value: string) { return `${"•".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`; }
function encrypt(value: string) {
  const encoded = process.env.VENDOR_DATA_ENCRYPTION_KEY;
  const key = encoded ? Buffer.from(encoded, "base64") : Buffer.alloc(0);
  if (key.length !== 32) throw new ApiProblem(503, "VENDOR_ENCRYPTION_NOT_CONFIGURED", "Vendor financial data encryption is not configured");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
}

function workspace(row: Awaited<ReturnType<PrismaClient["vendor"]["findUniqueOrThrow"]>> & { shops: any[]; kycSubmissions: any[]; bankAccounts: any[] }) {
  return {
    id: row.id, legalName: row.legalName, displayName: row.displayName, status: row.status, version: row.version,
    shops: row.shops.map((shop) => ({ id: shop.id, vendorId: shop.vendorId, name: shop.name, slug: shop.slug, status: shop.status, description: shop.description, settings: shop.settings, version: shop.version })),
    kycSubmissions: row.kycSubmissions.map((submission) => ({ id: submission.id, status: submission.status, submittedAt: submission.submittedAt?.toISOString() ?? null, reviewedAt: submission.reviewedAt?.toISOString() ?? null, rejectionReason: submission.rejectionReason, documents: submission.documents.map((document: any) => ({ id: document.id, documentType: document.documentType, storageKey: document.storageKey, mimeType: document.mimeType })) })),
    bankAccounts: row.bankAccounts.map((account) => ({ id: account.id, provider: account.provider, accountName: account.accountName, accountNumberMasked: account.accountNumberMasked, isDefault: account.isDefault, verifiedAt: account.verifiedAt?.toISOString() ?? null }))
  };
}

const include = { shops: { orderBy: { createdAt: "asc" as const } }, kycSubmissions: { include: { documents: true }, orderBy: { createdAt: "desc" as const } }, bankAccounts: { orderBy: { createdAt: "desc" as const } } };

export class VendorService {
  constructor(private readonly client: PrismaClient) {}
  async register(session: Session, input: VendorRegistration, correlationId?: string) {
    if (session.status !== "ACTIVE") throw new ApiProblem(403, "ACCOUNT_NOT_ACTIVE", "An active customer account is required");
    const existing = await this.client.vendorMember.findFirst({ where: { userId: session.principal.userId } });
    if (existing) throw new ApiProblem(409, "VENDOR_MEMBERSHIP_EXISTS", "This account already belongs to a vendor workspace");
    return this.client.$transaction(async (transaction) => {
      const ownerRole = await transaction.role.findUnique({ where: { name: "VENDOR_OWNER" } });
      if (!ownerRole) throw new ApiProblem(503, "VENDOR_ROLE_NOT_CONFIGURED", "The vendor owner role has not been seeded");
      const categories = await transaction.category.findMany({ where: { id: { in: input.categoryIds } }, select: { id: true } });
      if (categories.length !== input.categoryIds.length) throw new ApiProblem(400, "VENDOR_CATEGORY_INVALID", "One or more selected categories are unavailable");
      const vendor = await transaction.vendor.create({ data: { legalName: input.legalName, displayName: input.displayName, status: "PENDING", members: { create: { userId: session.principal.userId, role: "VENDOR_OWNER" } }, wallet: { create: {} }, shops: { create: { name: input.displayName, slug: slug(input.displayName, session.principal.userId), status: "DRAFT", description: input.description ?? null, settings: json({ phone: input.phone, pickupAddress: input.address, acceptedTerms: true, termsVersion: input.termsVersion, privacyVersion: input.privacyVersion }) } }, categoryRequests: { create: input.categoryIds.map((categoryId) => ({ categoryId, reason: "Requested during seller registration", description: "Initial seller category selection" })) } }, include });
      await transaction.userRole.upsert({ where: { userId_roleId: { userId: session.principal.userId, roleId: ownerRole.id } }, create: { userId: session.principal.userId, roleId: ownerRole.id }, update: {} });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "user", action: "vendor.registration.submitted", resourceType: "vendor", resourceId: vendor.id, ...(correlationId ? { correlationId } : {}), after: json({ shopName: input.displayName, categoryIds: input.categoryIds, termsVersion: input.termsVersion, privacyVersion: input.privacyVersion }) } });
      return workspace(vendor);
    });
  }
  async getWorkspace(session: Session) { const id = vendorId(session); return workspace(await this.client.vendor.findUniqueOrThrow({ where: { id }, include })); }
  async updateShop(session: Session, shopId: string, input: UpdateVendorShop) {
    const id = vendorId(session); requirePermission(session, "vendor:manage");
    const result = await this.client.vendorShop.updateMany({ where: { id: shopId, vendorId: id, version: input.version }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.settings !== undefined ? { settings: input.settings === null ? Prisma.JsonNull : json(input.settings) } : {}), version: { increment: 1 } } });
    if (!result.count) throw new ApiProblem(409, "SHOP_VERSION_CONFLICT", "The shop was changed or is outside your vendor account");
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.shop.updated", resourceType: "vendor_shop", resourceId: shopId } });
    return this.getWorkspace(session);
  }
  async submitKyc(session: Session, input: SubmitVendorKyc) {
    const id = vendorId(session); requirePermission(session, "kyc:manage");
    const submission = await this.client.vendorKycSubmission.create({ data: { vendorId: id, status: "SUBMITTED", submittedAt: new Date(), documents: { create: input.documents.map((document) => ({ ...document, checksum: document.checksum.toLowerCase() })) } } });
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.kyc.submitted", resourceType: "vendor_kyc_submission", resourceId: submission.id, after: json({ documentTypes: input.documents.map((item) => item.documentType) }) } });
    return this.getWorkspace(session);
  }
  async saveBankAccount(session: Session, input: SaveVendorBankAccount) {
    const id = vendorId(session); requirePermission(session, "finance:manage");
    const normalized = input.accountNumber.replace(/\s+/g, "");
    const encryptedPayload = encrypt(JSON.stringify({ accountNumber: normalized, digest: createHash("sha256").update(normalized).digest("hex") }));
    await this.client.$transaction(async (transaction) => {
      if (input.isDefault) await transaction.vendorBankAccount.updateMany({ where: { vendorId: id, isDefault: true }, data: { isDefault: false } });
      await transaction.vendorBankAccount.create({ data: { vendorId: id, provider: input.provider, accountName: input.accountName, accountNumberMasked: mask(normalized), encryptedPayload, isDefault: input.isDefault } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.bank_account.created", resourceType: "vendor_bank_account", resourceId: id, after: json({ provider: input.provider, accountNumberMasked: mask(normalized) }) } });
    });
    return this.getWorkspace(session);
  }
  async staff(session: Session) {
    const id = vendorId(session); requirePermission(session, "vendor:read");
    const rows = await this.client.vendorMember.findMany({ where: { vendorId: id }, include: { user: { include: { profile: true } }, permissions: true }, orderBy: { createdAt: "asc" } });
    return rows.map((member) => ({ id: member.id, userId: member.userId, displayName: member.user.profile?.displayName ?? null, email: member.user.normalizedEmail, role: member.role, status: member.status, permissions: member.permissions.filter((item) => item.granted).map((item) => item.permissionKey) }));
  }
  async updateStaff(session: Session, memberId: string, input: UpdateVendorStaff) {
    const id = vendorId(session); requirePermission(session, "vendor:manage");
    const member = await this.client.vendorMember.findFirst({ where: { id: memberId, vendorId: id } }); if (!member) throw new ApiProblem(404, "VENDOR_STAFF_NOT_FOUND", "Vendor staff member not found");
    if (member.userId === session.principal.userId) throw new ApiProblem(409, "VENDOR_SELF_STAFF_CHANGE_FORBIDDEN", "You cannot change your own vendor membership");
    await this.client.$transaction(async (transaction) => { await transaction.vendorMember.update({ where: { id: memberId }, data: { status: input.status } }); await transaction.vendorStaffPermission.deleteMany({ where: { memberId } }); if (input.permissions.length) await transaction.vendorStaffPermission.createMany({ data: input.permissions.map((permissionKey) => ({ memberId, permissionKey })) }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.staff.updated", resourceType: "vendor_member", resourceId: memberId, after: json(input) } }); });
    return this.staff(session);
  }
  async vouchers(session: Session) { const id = vendorId(session); requirePermission(session, "vendor:read"); const rows = await this.client.voucher.findMany({ where: { ownerType: "vendor", ownerId: id }, orderBy: { startsAt: "desc" }, take: 100 }); return rows.map((row) => ({ ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString() })); }
  async createVoucher(session: Session, input: CreateVendorVoucher) { const id = vendorId(session); requirePermission(session, "vendor:manage"); const row = await this.client.voucher.create({ data: { ownerType: "vendor", ownerId: id, code: input.code, rules: json({ discountType: input.discountType, value: input.value }), startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) } }); await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.voucher.created", resourceType: "voucher", resourceId: row.id, after: json({ code: row.code }) } }); return this.vouchers(session); }
  async report(session: Session, days = 30) {
    const id = vendorId(session); requirePermission(session, "vendor:read");
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);
    const [orders, productCount, lowStockCount, returnCount] = await Promise.all([this.client.vendorOrder.findMany({ where: { vendorId: id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 1000 }), this.client.product.count({ where: { vendorId: id } }), this.client.inventoryItem.count({ where: { variant: { product: { vendorId: id } }, onHand: { lte: 5 } } }), this.client.return.count({ where: { vendorOrder: { vendorId: id }, createdAt: { gte: since } } })]);
    const statusCounts = orders.reduce<Record<string, number>>((result, order) => ({ ...result, [order.status]: (result[order.status] ?? 0) + 1 }), {}); const delivered = orders.filter((order) => order.status === "DELIVERED");
    const grossSales = delivered.reduce((sum, order) => sum + order.totalMinor, 0n); const cancelledCount = orders.filter((order) => order.status === "CANCELLED").length;
    return { periodDays: days, orderCount: orders.length, deliveredCount: delivered.length, cancelledCount, returnCount, grossSalesMinor: grossSales.toString(), averageOrderMinor: delivered.length ? (grossSales / BigInt(delivered.length)).toString() : "0", fulfilmentRate: orders.length ? Number(((delivered.length / orders.length) * 100).toFixed(1)) : 0, productCount, lowStockCount, statusCounts, recentOrders: orders.slice(0, 12).map((order) => ({ id: order.id, status: order.status, totalMinor: order.totalMinor.toString(), createdAt: order.createdAt.toISOString() })) };
  }
  async returns(session: Session) { const id = vendorId(session); requirePermission(session, "orders:read"); const rows = await this.client.return.findMany({ where: { vendorOrder: { vendorId: id } }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 100 }); return rows.map((row) => ({ id: row.id, orderId: row.orderId, vendorOrderId: row.vendorOrderId, status: row.status, reasonCode: row.reasonCode, reasonDetail: row.reasonDetail, requestedAmount: { amountMinor: row.requestedMinor.toString(), currency: row.currency }, approvedAmount: row.approvedMinor === null ? null : { amountMinor: row.approvedMinor.toString(), currency: row.currency }, version: row.version, createdAt: row.createdAt.toISOString(), items: row.items.map((item) => ({ id: item.id, orderItemId: item.orderItemId, quantity: item.quantity, requestedAmount: { amountMinor: item.requestedMinor.toString(), currency: row.currency }, inspection: item.inspection })) })); }
  async categoryRequests(session: Session) { const id = vendorId(session); requirePermission(session, "products:manage"); const rows = await this.client.vendorCategoryRequest.findMany({ where: { vendorId: id }, include: { vendor: true, category: { include: { parent: true } } }, orderBy: { createdAt: "desc" } }); return rows.map(categoryRequestDto); }
  async createCategoryRequest(session: Session, input: CreateVendorCategoryRequest) { const id = vendorId(session); requirePermission(session, "products:manage"); const category = await this.client.category.findUnique({ where: { id: input.categoryId } }); if (!category) throw new ApiProblem(404, "CATEGORY_NOT_FOUND", "Category not found"); const existing = await this.client.vendorCategoryRequest.findUnique({ where: { vendorId_categoryId: { vendorId: id, categoryId: input.categoryId } } }); if (existing && existing.status !== "rejected") throw new ApiProblem(409, "CATEGORY_REQUEST_EXISTS", "A pending or approved request already exists for this category"); const row = await this.client.$transaction(async (transaction) => { const request = existing ? await transaction.vendorCategoryRequest.update({ where: { id: existing.id }, data: { status: "pending", reason: input.reason, description: input.description ?? null, reviewedBy: null, reviewedAt: null, reviewReason: null } }) : await transaction.vendorCategoryRequest.create({ data: { vendorId: id, categoryId: input.categoryId, reason: input.reason, description: input.description ?? null } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: existing ? "vendor.category_request.resubmitted" : "vendor.category_request.created", resourceType: "vendor_category_request", resourceId: request.id, after: json(input) } }); return request; }); return this.categoryRequests(session); }
}

function categoryRequestDto(row: { id: string; vendorId: string; categoryId: string; status: string; reason: string; description: string | null; reviewReason: string | null; reviewedAt: Date | null; createdAt: Date; vendor: { displayName: string }; category: { name: string; parent: { name: string } | null } }) { return { id: row.id, vendorId: row.vendorId, vendorName: row.vendor.displayName, categoryId: row.categoryId, categoryName: row.category.name, categoryPath: row.category.parent ? `${row.category.parent.name} > ${row.category.name}` : row.category.name, status: row.status, reason: row.reason, description: row.description, reviewReason: row.reviewReason, reviewedAt: row.reviewedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() }; }

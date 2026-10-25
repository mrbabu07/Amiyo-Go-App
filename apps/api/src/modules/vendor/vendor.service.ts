import { returnProductDetails, returnProductSelect } from "../operations/return-product.js";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { CreateVendorCategoryRequest, CreateVendorVoucher, InviteVendorStaff, SaveVendorBankAccount, Session, SubmitVendorKyc, UpdateVendorBankAccount, UpdateVendorShop, UpdateVendorStaff, VendorRegistration } from "@amiyo/contracts";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
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
function mediaUrl(storageKey: string | null) {
  if (!storageKey) return null;
  const base = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/$/, "");
  return base ? `${base}/${storageKey}` : `https://media.amiyo.local/${storageKey}`;
}
function slug(value: string, userId: string) { const base = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "shop"; return `${base.slice(0, 100)}-${userId.replaceAll("-", "")}`; }
function mask(value: string) { return `${"•".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`; }
const roundOne = (value: number) => Number(value.toFixed(1));
function metricState(value: number, target: number, higherIsBetter: boolean, sampleSize: number) {
  if (!sampleSize) return "not_enough_data" as const;
  const distance = higherIsBetter ? value - target : target - value;
  if (distance >= 0) return "healthy" as const;
  if (distance >= (higherIsBetter ? -10 : -3)) return "watch" as const;
  return "action_required" as const;
}
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
    shops: row.shops.map((shop) => ({ id: shop.id, vendorId: shop.vendorId, name: shop.name, slug: shop.slug, status: shop.status, description: shop.description, logoUrl: mediaUrl(shop.logoStorageKey), bannerUrl: mediaUrl(shop.bannerStorageKey), settings: shop.settings, version: shop.version })),
    kycSubmissions: row.kycSubmissions.map((submission) => ({ id: submission.id, status: submission.status, submittedAt: submission.submittedAt?.toISOString() ?? null, reviewedAt: submission.reviewedAt?.toISOString() ?? null, rejectionReason: submission.rejectionReason, documents: submission.documents.map((document: any) => ({ id: document.id, documentType: document.documentType, mimeType: document.mimeType })) })),
    bankAccounts: row.bankAccounts.map((account) => ({ id: account.id, provider: account.provider, accountName: account.accountName, accountNumberMasked: account.accountNumberMasked, isDefault: account.isDefault, verifiedAt: account.verifiedAt?.toISOString() ?? null }))
  };
}

const include = { shops: { orderBy: { createdAt: "asc" as const } }, kycSubmissions: { include: { documents: true }, orderBy: { createdAt: "desc" as const } }, bankAccounts: { orderBy: { createdAt: "desc" as const } } };

export class VendorService {
  constructor(private readonly client: PrismaClient) {}
  private async workspace(id: string) {
    const [vendor, shops, kycSubmissions, bankAccounts] = await Promise.all([
      this.client.vendor.findUniqueOrThrow({ where: { id } }),
      this.client.vendorShop.findMany({ where: { vendorId: id }, orderBy: { createdAt: "asc" } }),
      this.client.vendorKycSubmission.findMany({ where: { vendorId: id }, include: { documents: true }, orderBy: { createdAt: "desc" } }),
      this.client.vendorBankAccount.findMany({ where: { vendorId: id }, orderBy: { createdAt: "desc" } })
    ]);
    return workspace({ ...vendor, shops, kycSubmissions, bankAccounts });
  }
  async register(session: Session, input: VendorRegistration, correlationId?: string) {
    if (session.status !== "ACTIVE") throw new ApiProblem(403, "ACCOUNT_NOT_ACTIVE", "An active customer account is required");
    const configuration = await this.client.platformConfiguration?.findUnique({ where: { key: "default" } }); const flags = configuration?.featureFlags as { sellerRegistration?: boolean } | undefined; const maintenance = configuration?.maintenanceMode as { enabled?: boolean; message?: string } | undefined;
    if (maintenance?.enabled) throw new ApiProblem(503, "PLATFORM_MAINTENANCE", maintenance.message || "Seller registration is temporarily unavailable");
    if (flags?.sellerRegistration === false) throw new ApiProblem(503, "SELLER_REGISTRATION_DISABLED", "Seller registration is temporarily paused");
    const existing = await this.client.vendorMember.findFirst({ where: { userId: session.principal.userId } });
    if (existing) throw new ApiProblem(409, "VENDOR_MEMBERSHIP_EXISTS", "This account already belongs to a vendor workspace");
    return withSerializableTransaction(this.client, async (transaction) => {
      const ownerRole = await transaction.role.findUnique({ where: { name: "VENDOR_OWNER" } });
      if (!ownerRole) throw new ApiProblem(503, "VENDOR_ROLE_NOT_CONFIGURED", "The vendor owner role has not been seeded");
      const categories = await transaction.category.findMany({ where: { id: { in: input.categoryIds } }, select: { id: true } });
      if (categories.length !== input.categoryIds.length) throw new ApiProblem(400, "VENDOR_CATEGORY_INVALID", "One or more selected categories are unavailable");
      const pickupAddress = { name: input.displayName, phone: input.phone.replace(/\s+/g, ""), address: input.address.line1, division: input.address.division, district: input.address.district, upazila: input.address.upazila, union: input.address.unionName ?? "" };
      const vendor = await transaction.vendor.create({ data: { legalName: input.legalName, displayName: input.displayName, status: "PENDING", members: { create: { userId: session.principal.userId, role: "VENDOR_OWNER" } }, wallet: { create: {} }, shops: { create: { name: input.displayName, slug: slug(input.displayName, session.principal.userId), status: "DRAFT", description: input.description ?? null, settings: json({ pickupAddress, acceptedTerms: true, termsVersion: input.termsVersion, privacyVersion: input.privacyVersion }) } }, categoryRequests: { create: input.categoryIds.map((categoryId) => ({ categoryId, reason: "Requested during seller registration", description: "Initial seller category selection" })) } }, include });
      await transaction.userRole.upsert({ where: { userId_roleId: { userId: session.principal.userId, roleId: ownerRole.id } }, create: { userId: session.principal.userId, roleId: ownerRole.id }, update: {} });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "user", action: "vendor.registration.submitted", resourceType: "vendor", resourceId: vendor.id, ...(correlationId ? { correlationId } : {}), after: json({ shopName: input.displayName, categoryIds: input.categoryIds, termsVersion: input.termsVersion, privacyVersion: input.privacyVersion }) } });
      return workspace(vendor);
    });
  }
  async getWorkspace(session: Session) { return this.workspace(vendorId(session)); }
  async updateShop(session: Session, shopId: string, input: UpdateVendorShop) {
    const id = vendorId(session); requirePermission(session, "vendor:manage");
    await withSerializableTransaction(this.client, async (transaction) => {
      const requestedUploads = [input.logoUploadId, input.bannerUploadId].filter((value): value is string => typeof value === "string");
      const uploads = requestedUploads.length ? await transaction.mediaUpload.findMany({ where: { id: { in: requestedUploads }, userId: session.principal.userId, visibility: "public", status: "ready", mimeType: { startsWith: "image/" } }, select: { id: true, purpose: true, storageKey: true } }) : [];
      const byId = new Map(uploads.map((upload) => [upload.id, upload]));
      const logo = typeof input.logoUploadId === "string" ? byId.get(input.logoUploadId) : undefined;
      const banner = typeof input.bannerUploadId === "string" ? byId.get(input.bannerUploadId) : undefined;
      if (typeof input.logoUploadId === "string" && logo?.purpose !== "shop") throw new ApiProblem(400, "SHOP_LOGO_UPLOAD_INVALID", "Shop logo must be your completed public shop image upload");
      if (typeof input.bannerUploadId === "string" && banner?.purpose !== "banner") throw new ApiProblem(400, "SHOP_BANNER_UPLOAD_INVALID", "Shop banner must be your completed public banner image upload");
      const result = await transaction.vendorShop.updateMany({ where: { id: shopId, vendorId: id, version: input.version }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.logoUploadId !== undefined ? { logoStorageKey: input.logoUploadId === null ? null : logo!.storageKey } : {}), ...(input.bannerUploadId !== undefined ? { bannerStorageKey: input.bannerUploadId === null ? null : banner!.storageKey } : {}), ...(input.settings !== undefined ? { settings: input.settings === null ? Prisma.JsonNull : json(input.settings) } : {}), version: { increment: 1 } } });
      if (!result.count) throw new ApiProblem(409, "SHOP_VERSION_CONFLICT", "The shop was changed or is outside your vendor account");
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.shop.updated", resourceType: "vendor_shop", resourceId: shopId, after: json({ nameChanged: input.name !== undefined, descriptionChanged: input.description !== undefined, logoChanged: input.logoUploadId !== undefined, bannerChanged: input.bannerUploadId !== undefined, settingsChanged: input.settings !== undefined }) } });
    });
    return this.getWorkspace(session);
  }
  async submitKyc(session: Session, input: SubmitVendorKyc) {
    const id = vendorId(session); requirePermission(session, "kyc:manage");
    const submission = await withSerializableTransaction(this.client, async (transaction) => {
      const pending = await transaction.vendorKycSubmission.findFirst({ where: { vendorId: id, status: { in: ["SUBMITTED", "REVIEWING", "APPROVED"] } }, select: { id: true, status: true } });
      if (pending) throw new ApiProblem(409, "VENDOR_KYC_ALREADY_ACTIVE", `A ${pending.status.toLowerCase()} KYC submission already exists`);
      const keys = input.documents.map((document) => document.storageKey);
      const uploads = await transaction.mediaUpload.findMany({ where: { userId: session.principal.userId, purpose: "kyc", visibility: "private", status: "ready", storageKey: { in: keys } }, select: { storageKey: true, mimeType: true, checksum: true } });
      const byKey = new Map(uploads.map((upload) => [upload.storageKey, upload]));
      const verified = input.documents.map((document) => {
        const upload = byKey.get(document.storageKey);
        if (!upload || upload.mimeType !== document.mimeType || !upload.checksum || upload.checksum.toLowerCase() !== document.checksum.toLowerCase()) throw new ApiProblem(400, "VENDOR_KYC_DOCUMENT_INVALID", "Every KYC document must be your private, scanned and completed upload");
        return { ...document, checksum: upload.checksum.toLowerCase() };
      });
      const created = await transaction.vendorKycSubmission.create({ data: { vendorId: id, status: "SUBMITTED", submittedAt: new Date(), documents: { create: verified } } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.kyc.submitted", resourceType: "vendor_kyc_submission", resourceId: created.id, after: json({ documentTypes: verified.map((item) => item.documentType) }) } });
      return created;
    });
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
  async updateBankAccount(session: Session, accountId: string, input: UpdateVendorBankAccount) {
    const id = vendorId(session); requirePermission(session, "finance:manage");
    await this.client.$transaction(async (transaction) => {
      const account = await transaction.vendorBankAccount.findFirst({ where: { id: accountId, vendorId: id } });
      if (!account) throw new ApiProblem(404, "VENDOR_BANK_ACCOUNT_NOT_FOUND", "Payout account not found");
      if (input.isDefault) await transaction.vendorBankAccount.updateMany({ where: { vendorId: id, isDefault: true, id: { not: accountId } }, data: { isDefault: false } });
      await transaction.vendorBankAccount.update({ where: { id: accountId }, data: { ...(input.accountName !== undefined ? { accountName: input.accountName } : {}), ...(input.isDefault ? { isDefault: true } : {}) } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.bank_account.updated", resourceType: "vendor_bank_account", resourceId: accountId, metadata: json({ vendorId: id }), after: json({ accountNameChanged: input.accountName !== undefined, madeDefault: input.isDefault === true }) } });
    });
    return this.getWorkspace(session);
  }
  async removeBankAccount(session: Session, accountId: string) {
    const id = vendorId(session); requirePermission(session, "finance:manage");
    await this.client.$transaction(async (transaction) => {
      const account = await transaction.vendorBankAccount.findFirst({ where: { id: accountId, vendorId: id }, include: { _count: { select: { payoutRequests: true } } } });
      if (!account) throw new ApiProblem(404, "VENDOR_BANK_ACCOUNT_NOT_FOUND", "Payout account not found");
      if (account._count.payoutRequests) throw new ApiProblem(409, "VENDOR_BANK_ACCOUNT_IN_USE", "A payout account with settlement history cannot be removed");
      await transaction.vendorBankAccount.delete({ where: { id: accountId } });
      if (account.isDefault) { const replacement = await transaction.vendorBankAccount.findFirst({ where: { vendorId: id }, orderBy: { createdAt: "desc" }, select: { id: true } }); if (replacement) await transaction.vendorBankAccount.update({ where: { id: replacement.id }, data: { isDefault: true } }); }
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.bank_account.removed", resourceType: "vendor_bank_account", resourceId: accountId, metadata: json({ vendorId: id }), before: json({ provider: account.provider, accountNumberMasked: account.accountNumberMasked, isDefault: account.isDefault }) } });
    });
    return this.getWorkspace(session);
  }
  async staff(session: Session) {
    const id = vendorId(session); requirePermission(session, "vendor:read");
    const rows = await this.client.vendorMember.findMany({ where: { vendorId: id }, include: { user: { include: { profile: true } }, permissions: true }, orderBy: { createdAt: "asc" } });
    return rows.map((member) => ({ id: member.id, userId: member.userId, displayName: member.user.profile?.displayName ?? null, email: member.user.normalizedEmail, role: member.role, status: member.status, permissions: member.permissions.filter((item) => item.granted).map((item) => item.permissionKey) }));
  }
  async staffAudit(session: Session) {
    const id = vendorId(session); requirePermission(session, "vendor:manage");
    const memberIds = (await this.client.vendorMember.findMany({ where: { vendorId: id }, select: { id: true } })).map((member) => member.id);
    const rows = await this.client.auditLog.findMany({ where: { action: { in: ["vendor.staff.invited", "vendor.staff.updated", "vendor.staff.removed"] }, OR: [{ resourceId: { in: memberIds } }, { metadata: { path: ["vendorId"], equals: id } }] }, orderBy: { createdAt: "desc" }, take: 30 });
    return rows.map((row) => ({ id: row.id, action: row.action, memberId: row.resourceId, actorUserId: row.actorUserId, before: row.before, after: row.after, createdAt: row.createdAt.toISOString() }));
  }
  async inviteStaff(session: Session, input: InviteVendorStaff) {
    const id = vendorId(session); requirePermission(session, "vendor:manage");
    const account = await this.client.user.findUnique({ where: { normalizedEmail: input.email }, select: { id: true, status: true } });
    if (!account || account.status !== "ACTIVE") throw new ApiProblem(404, "VENDOR_STAFF_ACCOUNT_NOT_FOUND", "Ask this team member to create an active Amiyo account first");
    if (account.id === session.principal.userId) throw new ApiProblem(409, "VENDOR_SELF_INVITE_FORBIDDEN", "You already own this seller workspace");
    const existing = await this.client.vendorMember.findFirst({ where: { userId: account.id }, select: { id: true, vendorId: true } });
    if (existing?.vendorId === id) throw new ApiProblem(409, "VENDOR_STAFF_ALREADY_EXISTS", "This account already belongs to your seller workspace");
    if (existing) throw new ApiProblem(409, "VENDOR_STAFF_OTHER_WORKSPACE", "This account already belongs to another seller workspace");
    try {
      await withSerializableTransaction(this.client, async (transaction) => {
        const member = await transaction.vendorMember.create({ data: { vendorId: id, userId: account.id, role: input.role, permissions: { create: ["vendor:read", ...input.permissions].map((permissionKey) => ({ permissionKey })) } } });
        await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.staff.invited", resourceType: "vendor_member", resourceId: member.id, metadata: json({ vendorId: id }), after: json({ email: input.email, role: input.role, permissions: input.permissions }) } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiProblem(409, "VENDOR_STAFF_ALREADY_EXISTS", "This account already belongs to a seller workspace");
      throw error;
    }
    return this.staff(session);
  }
  async updateStaff(session: Session, memberId: string, input: UpdateVendorStaff) {
    const id = vendorId(session); requirePermission(session, "vendor:manage");
    const member = await this.client.vendorMember.findFirst({ where: { id: memberId, vendorId: id } }); if (!member) throw new ApiProblem(404, "VENDOR_STAFF_NOT_FOUND", "Vendor staff member not found");
    if (member.userId === session.principal.userId) throw new ApiProblem(409, "VENDOR_SELF_STAFF_CHANGE_FORBIDDEN", "You cannot change your own vendor membership");
    await this.client.$transaction(async (transaction) => { await transaction.vendorMember.update({ where: { id: memberId }, data: { status: input.status } }); await transaction.vendorStaffPermission.deleteMany({ where: { memberId } }); if (input.permissions.length) await transaction.vendorStaffPermission.createMany({ data: input.permissions.map((permissionKey) => ({ memberId, permissionKey })) }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.staff.updated", resourceType: "vendor_member", resourceId: memberId, metadata: json({ vendorId: id }), before: json({ status: member.status }), after: json(input) } }); });
    return this.staff(session);
  }
  async removeStaff(session: Session, memberId: string) {
    const id = vendorId(session); requirePermission(session, "vendor:manage");
    const member = await this.client.vendorMember.findFirst({ where: { id: memberId, vendorId: id }, include: { permissions: true } });
    if (!member) throw new ApiProblem(404, "VENDOR_STAFF_NOT_FOUND", "Vendor staff member not found");
    if (member.role === "VENDOR_OWNER" || member.userId === session.principal.userId) throw new ApiProblem(409, "VENDOR_OWNER_REMOVE_FORBIDDEN", "The seller workspace owner cannot be removed");
    await this.client.$transaction(async (transaction) => { await transaction.vendorMember.delete({ where: { id: memberId } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.staff.removed", resourceType: "vendor_member", resourceId: memberId, metadata: json({ vendorId: id }), before: json({ userId: member.userId, role: member.role, status: member.status, permissions: member.permissions.filter((item) => item.granted).map((item) => item.permissionKey) }) } }); });
    return this.staff(session);
  }
  async vouchers(session: Session) { const id = vendorId(session); requirePermission(session, "vendor:read"); const rows = await this.client.voucher.findMany({ where: { ownerType: "vendor", ownerId: id }, orderBy: { startsAt: "desc" }, take: 100 }); return rows.map((row) => ({ ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString() })); }
  async createVoucher(session: Session, input: CreateVendorVoucher) { const id = vendorId(session); requirePermission(session, "vendor:manage"); const row = await this.client.voucher.create({ data: { ownerType: "vendor", ownerId: id, code: input.code, rules: json({ discountType: input.discountType, value: input.value }), startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) } }); await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "vendor.voucher.created", resourceType: "voucher", resourceId: row.id, after: json({ code: row.code }) } }); return this.vouchers(session); }
  async report(session: Session, days = 30) {
    const id = vendorId(session); requirePermission(session, "vendor:read");
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);
    const where = { vendorId: id, createdAt: { gte: since } };
    const dispatchSlaHours = 48;
    const [statusRows, recentOrders, productCount, lowStockCount, returnCount, dispatchRows, ratingAggregate] = await Promise.all([
      this.client.vendorOrder.groupBy({ by: ["status"], where, _count: { _all: true }, _sum: { totalMinor: true } }),
      this.client.vendorOrder.findMany({ where, select: { id: true, status: true, totalMinor: true, createdAt: true, order: { select: { orderNumber: true } }, shop: { select: { name: true } }, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, take: 12 }),
      this.client.product.count({ where: { vendorId: id } }),
      this.client.inventoryItem.count({ where: { variant: { product: { vendorId: id } }, onHand: { lte: 5 } } }),
      this.client.return.count({ where: { vendorOrder: { vendorId: id }, createdAt: { gte: since } } }),
      this.client.vendorOrder.findMany({ where: { ...where, shipments: { some: { shippedAt: { not: null } } } }, select: { createdAt: true, shipments: { select: { shippedAt: true }, take: 1 } } }),
      this.client.review.aggregate({ where: { product: { vendorId: id }, status: "published", createdAt: { gte: since } }, _avg: { rating: true }, _count: { _all: true } })
    ]);
    const statusCounts = Object.fromEntries(statusRows.map((row) => [row.status, row._count._all]));
    const orderCount = statusRows.reduce((sum, row) => sum + row._count._all, 0);
    const delivered = statusRows.find((row) => row.status === "DELIVERED");
    const deliveredCount = delivered?._count._all ?? 0;
    const grossSales = delivered?._sum.totalMinor ?? 0n;
    const cancelledCount = statusCounts.CANCELLED ?? 0;
    const rejectedCount = statusCounts.REJECTED ?? 0;
    const fulfilmentRate = orderCount ? roundOne((deliveredCount / orderCount) * 100) : 0;
    const cancellationRate = orderCount ? roundOne(((cancelledCount + rejectedCount) / orderCount) * 100) : 0;
    const returnRate = deliveredCount ? roundOne((returnCount / deliveredCount) * 100) : 0;
    const onTimeDispatchCount = dispatchRows.filter((row) => { const shippedAt = row.shipments[0]?.shippedAt; return shippedAt && shippedAt.getTime() <= row.createdAt.getTime() + dispatchSlaHours * 60 * 60_000; }).length;
    const onTimeDispatchRate = dispatchRows.length ? roundOne((onTimeDispatchCount / dispatchRows.length) * 100) : 0;
    const rating = roundOne(ratingAggregate._avg.rating ?? 0);
    const score = orderCount < 5 ? 0 : Math.round(Math.max(0, Math.min(100, fulfilmentRate * .35 + Math.max(0, 100 - cancellationRate * 5) * .2 + Math.max(0, 100 - returnRate * 5) * .2 + onTimeDispatchRate * .15 + (rating / 5) * 10)));
    const recommendations = [
      ...(fulfilmentRate < 90 && orderCount ? ["Complete accepted orders consistently to keep fulfilment above 90%."] : []),
      ...(cancellationRate > 5 ? ["Keep inventory current and accept only orders you can fulfil."] : []),
      ...(returnRate > 5 ? ["Review return reasons and improve listing accuracy or packaging."] : []),
      ...(onTimeDispatchRate < 90 && dispatchRows.length ? [`Hand parcels over within ${dispatchSlaHours} hours of order creation.`] : []),
      ...(rating < 4.2 && ratingAggregate._count._all ? ["Reply to reviews and resolve recurring product-quality concerns."] : [])
    ].slice(0, 5);
    const performance = {
      score, tier: orderCount < 5 ? "new_seller" as const : score >= 90 ? "excellent" as const : score >= 75 ? "good" as const : "needs_attention" as const, dispatchSlaHours,
      fulfilment: { value: fulfilmentRate, target: 90, sampleSize: orderCount, state: metricState(fulfilmentRate, 90, true, orderCount) },
      cancellation: { value: cancellationRate, target: 5, sampleSize: orderCount, state: metricState(cancellationRate, 5, false, orderCount) },
      returns: { value: returnRate, target: 5, sampleSize: deliveredCount, state: metricState(returnRate, 5, false, deliveredCount) },
      onTimeDispatch: { value: onTimeDispatchRate, target: 90, sampleSize: dispatchRows.length, state: metricState(onTimeDispatchRate, 90, true, dispatchRows.length) },
      rating: { value: rating, target: 4.2, sampleSize: ratingAggregate._count._all, state: metricState(rating, 4.2, true, ratingAggregate._count._all) }, recommendations
    };
    return { periodDays: days, orderCount, deliveredCount, cancelledCount, returnCount, grossSalesMinor: grossSales.toString(), averageOrderMinor: deliveredCount ? (grossSales / BigInt(deliveredCount)).toString() : "0", fulfilmentRate, productCount, lowStockCount, statusCounts, performance, recentOrders: recentOrders.map((order) => ({ id: order.id, orderNumber: order.order.orderNumber, shopName: order.shop.name, itemCount: order._count.items, status: order.status, totalMinor: order.totalMinor.toString(), createdAt: order.createdAt.toISOString() })) };
  }
  async returns(session: Session) { const id = vendorId(session); requirePermission(session, "orders:read"); const rows = await this.client.return.findMany({ where: { vendorOrder: { vendorId: id } }, include: { items: { include: { orderItem: { select: returnProductSelect } } } }, orderBy: { createdAt: "desc" }, take: 100 }); return rows.map((row) => ({ id: row.id, orderId: row.orderId, vendorOrderId: row.vendorOrderId, status: row.status, reasonCode: row.reasonCode, reasonDetail: row.reasonDetail, requestedAmount: { amountMinor: row.requestedMinor.toString(), currency: row.currency }, approvedAmount: row.approvedMinor === null ? null : { amountMinor: row.approvedMinor.toString(), currency: row.currency }, version: row.version, createdAt: row.createdAt.toISOString(), items: row.items.map((item) => ({ ...returnProductDetails(item.orderItem), id: item.id, orderItemId: item.orderItemId, quantity: item.quantity, requestedAmount: { amountMinor: item.requestedMinor.toString(), currency: row.currency }, inspection: item.inspection })) })); }
  async categoryRequests(session: Session) { const id = vendorId(session); requirePermission(session, "products:manage"); const rows = await this.client.vendorCategoryRequest.findMany({ where: { vendorId: id }, include: { vendor: true, category: { include: { parent: true } } }, orderBy: { createdAt: "desc" } }); return rows.map(categoryRequestDto); }
  async createCategoryRequest(session: Session, input: CreateVendorCategoryRequest) { const id = vendorId(session); requirePermission(session, "products:manage"); const category = await this.client.category.findUnique({ where: { id: input.categoryId } }); if (!category) throw new ApiProblem(404, "CATEGORY_NOT_FOUND", "Category not found"); const existing = await this.client.vendorCategoryRequest.findUnique({ where: { vendorId_categoryId: { vendorId: id, categoryId: input.categoryId } } }); if (existing && existing.status !== "rejected") throw new ApiProblem(409, "CATEGORY_REQUEST_EXISTS", "A pending or approved request already exists for this category"); const row = await this.client.$transaction(async (transaction) => { const request = existing ? await transaction.vendorCategoryRequest.update({ where: { id: existing.id }, data: { status: "pending", reason: input.reason, description: input.description ?? null, reviewedBy: null, reviewedAt: null, reviewReason: null } }) : await transaction.vendorCategoryRequest.create({ data: { vendorId: id, categoryId: input.categoryId, reason: input.reason, description: input.description ?? null } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: existing ? "vendor.category_request.resubmitted" : "vendor.category_request.created", resourceType: "vendor_category_request", resourceId: request.id, after: json(input) } }); return request; }); return this.categoryRequests(session); }
}

function categoryRequestDto(row: { id: string; vendorId: string; categoryId: string; status: string; reason: string; description: string | null; reviewReason: string | null; reviewedAt: Date | null; createdAt: Date; vendor: { displayName: string }; category: { name: string; parent: { name: string } | null } }) { return { id: row.id, vendorId: row.vendorId, vendorName: row.vendor.displayName, categoryId: row.categoryId, categoryName: row.category.name, categoryPath: row.category.parent ? `${row.category.parent.name} > ${row.category.name}` : row.category.name, status: row.status, reason: row.reason, description: row.description, reviewReason: row.reviewReason, reviewedAt: row.reviewedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() }; }

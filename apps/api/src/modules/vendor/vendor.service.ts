import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { SaveVendorBankAccount, Session, SubmitVendorKyc, UpdateVendorShop } from "@amiyo/contracts";
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
}

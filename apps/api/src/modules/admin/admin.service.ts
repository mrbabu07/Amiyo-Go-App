import { Prisma, type PrismaClient } from "@prisma/client";
import type { AdminKycReviewInput, AdminUserStatusInput, AdminVendorStatusInput, Session, TrustCaseActionInput } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

function requireAdmin(session: Session, write = false) {
  const permission = write ? "admin:manage" : "admin:read";
  if (session.status !== "ACTIVE" || !session.permissions.includes(permission)) throw new ApiProblem(403, "ADMIN_ACCESS_REQUIRED", `${permission} access is required`);
}
function json(value: unknown) { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }

export class AdminService {
  constructor(private readonly client: PrismaClient) {}
  async workspace(session: Session) {
    requireAdmin(session);
    const [users, vendors, kyc, trustCases] = await Promise.all([
      this.client.user.findMany({ include: { profile: true, roles: { include: { role: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
      this.client.vendor.findMany({ include: { _count: { select: { members: true, shops: true } }, kycSubmissions: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 100 }),
      this.client.vendorKycSubmission.findMany({ where: { status: { in: ["SUBMITTED", "REVIEWING"] } }, include: { vendor: true, documents: true }, orderBy: { createdAt: "asc" }, take: 100 }),
      this.client.trustCase.findMany({ include: { actions: { orderBy: { createdAt: "asc" } } }, orderBy: [{ severity: "desc" }, { createdAt: "asc" }], take: 100 })
    ]);
    return {
      users: users.map((user) => ({ id: user.id, email: user.normalizedEmail, phone: user.normalizedPhone, displayName: user.profile?.displayName ?? null, status: user.status, roles: user.roles.map(({ role }) => role.name), createdAt: user.createdAt.toISOString() })),
      vendors: vendors.map((vendor) => ({ id: vendor.id, legalName: vendor.legalName, displayName: vendor.displayName, status: vendor.status, version: vendor.version, memberCount: vendor._count.members, shopCount: vendor._count.shops, latestKycStatus: vendor.kycSubmissions[0]?.status ?? null, createdAt: vendor.createdAt.toISOString() })),
      kyc: kyc.map((submission) => ({ id: submission.id, vendorId: submission.vendorId, vendorName: submission.vendor.displayName, status: submission.status, submittedAt: submission.submittedAt?.toISOString() ?? null, rejectionReason: submission.rejectionReason, documents: submission.documents.map((document) => ({ id: document.id, documentType: document.documentType, storageKey: document.storageKey, mimeType: document.mimeType })) })),
      trustCases: trustCases.map((trustCase) => ({ id: trustCase.id, subjectType: trustCase.subjectType, subjectId: trustCase.subjectId, caseType: trustCase.caseType, severity: trustCase.severity, status: trustCase.status, assignedTo: trustCase.assignedTo, summary: trustCase.summary, createdAt: trustCase.createdAt.toISOString(), actions: trustCase.actions.map((action) => ({ id: action.id, actionType: action.actionType, actorUserId: action.actorUserId, reason: action.reason, createdAt: action.createdAt.toISOString() })) }))
    };
  }
  async updateUser(session: Session, userId: string, input: AdminUserStatusInput) {
    requireAdmin(session, true); if (userId === session.principal.userId) throw new ApiProblem(409, "SELF_STATUS_CHANGE_FORBIDDEN", "You cannot change your own account status");
    const before = await this.client.user.findUnique({ where: { id: userId } }); if (!before) throw new ApiProblem(404, "USER_NOT_FOUND", "User not found");
    await this.client.$transaction([this.client.user.update({ where: { id: userId }, data: { status: input.status } }), this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "admin.user.status_changed", resourceType: "user", resourceId: userId, before: json({ status: before.status }), after: json(input) } })]);
    return this.workspace(session);
  }
  async updateVendor(session: Session, vendorId: string, input: AdminVendorStatusInput) {
    requireAdmin(session, true); const before = await this.client.vendor.findUnique({ where: { id: vendorId } }); if (!before) throw new ApiProblem(404, "VENDOR_NOT_FOUND", "Vendor not found");
    await this.client.$transaction([this.client.vendor.update({ where: { id: vendorId }, data: { status: input.status, approvedAt: input.status === "APPROVED" ? new Date() : before.approvedAt, version: { increment: 1 } } }), this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "admin.vendor.status_changed", resourceType: "vendor", resourceId: vendorId, before: json({ status: before.status }), after: json(input) } })]);
    return this.workspace(session);
  }
  async reviewKyc(session: Session, id: string, input: AdminKycReviewInput) {
    requireAdmin(session, true); const before = await this.client.vendorKycSubmission.findUnique({ where: { id } }); if (!before) throw new ApiProblem(404, "KYC_NOT_FOUND", "KYC submission not found");
    if (!(["SUBMITTED", "REVIEWING"] as const).includes(before.status as "SUBMITTED" | "REVIEWING")) throw new ApiProblem(409, "KYC_NOT_REVIEWABLE", "KYC submission is no longer reviewable");
    await this.client.$transaction(async (transaction) => { await transaction.vendorKycSubmission.update({ where: { id }, data: { status: input.status, reviewedBy: session.principal.userId, reviewedAt: input.status === "REVIEWING" ? null : new Date(), rejectionReason: input.status === "REJECTED" ? input.reason ?? null : null } }); if (input.status === "APPROVED") await transaction.vendor.update({ where: { id: before.vendorId }, data: { status: "APPROVED", approvedAt: new Date(), version: { increment: 1 } } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "admin.vendor_kyc.reviewed", resourceType: "vendor_kyc_submission", resourceId: id, before: json({ status: before.status }), after: json(input) } }); });
    return this.workspace(session);
  }
  async actOnTrustCase(session: Session, id: string, input: TrustCaseActionInput) {
    requireAdmin(session, true); const trustCase = await this.client.trustCase.findUnique({ where: { id } }); if (!trustCase) throw new ApiProblem(404, "TRUST_CASE_NOT_FOUND", "Trust case not found"); const status = input.action === "INVESTIGATE" ? "investigating" : input.action.toLowerCase();
    await this.client.$transaction([this.client.trustCase.update({ where: { id }, data: { status, assignedTo: trustCase.assignedTo ?? session.principal.userId, actions: { create: { actionType: input.action, actorUserId: session.principal.userId, reason: input.reason } } } }), this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "admin.trust_case.action", resourceType: "trust_case", resourceId: id, after: json(input) } })]);
    return this.workspace(session);
  }
}

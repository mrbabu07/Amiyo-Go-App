import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

type EvidenceStorage = { createReadUrl(key: string, expiresAt: Date, download: boolean): Promise<string> };

export class AdminPaymentEvidenceAccessService {
  constructor(private readonly client: PrismaClient, private readonly storage: EvidenceStorage) {}

  async access(session: Session, verificationId: string, uploadId: string, download: boolean) {
    if (session.status !== "ACTIVE" || !session.permissions.includes("admin:read")) throw new ApiProblem(403, "ADMIN_ACCESS_REQUIRED", "admin:read access is required");
    const verification = await this.client.paymentVerification.findUnique({ where: { id: verificationId }, select: { evidenceStorageKey: true } });
    if (!verification?.evidenceStorageKey) throw new ApiProblem(404, "PAYMENT_EVIDENCE_NOT_FOUND", "Payment evidence not found");
    const upload = await this.client.mediaUpload.findFirst({ where: { id: uploadId, storageKey: verification.evidenceStorageKey, purpose: "payment_evidence", visibility: "private", status: "ready" }, select: { storageKey: true, mimeType: true } });
    if (!upload) throw new ApiProblem(404, "PAYMENT_EVIDENCE_NOT_FOUND", "Payment evidence not found");
    const forceDownload = download || !["image/jpeg", "image/png", "image/webp"].includes(upload.mimeType);
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "payment.verification_evidence.accessed", resourceType: "payment_verification", resourceId: verificationId, after: { uploadId, download: forceDownload } } });
    return { url: await this.storage.createReadUrl(upload.storageKey, expiresAt, forceDownload), expiresAt: expiresAt.toISOString() };
  }
}

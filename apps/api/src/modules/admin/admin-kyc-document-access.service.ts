import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

type DocumentStorage = { createReadUrl(key: string, expiresAt: Date, download: boolean): Promise<string> };

export class AdminKycDocumentAccessService {
  constructor(private readonly client: PrismaClient, private readonly storage: DocumentStorage) {}

  async access(session: Session, submissionId: string, documentId: string, download: boolean) {
    if (session.status !== "ACTIVE" || !session.permissions.includes("admin:read")) throw new ApiProblem(403, "ADMIN_ACCESS_REQUIRED", "admin:read access is required");
    const document = await this.client.vendorKycDocument.findFirst({ where: { id: documentId, submissionId }, select: { storageKey: true, mimeType: true } });
    if (!document) throw new ApiProblem(404, "KYC_DOCUMENT_NOT_FOUND", "KYC document not found");
    const inlineImage = ["image/jpeg", "image/png", "image/webp"].includes(document.mimeType);
    const forceDownload = download || !inlineImage;
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "vendor.kyc_document.accessed", resourceType: "vendor_kyc_submission", resourceId: submissionId, after: { documentId, download: forceDownload } } });
    return { url: await this.storage.createReadUrl(document.storageKey, expiresAt, forceDownload), expiresAt: expiresAt.toISOString() };
  }
}

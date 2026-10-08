import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

type EvidenceStorage = { createReadUrl(key: string, expiresAt: Date, download: boolean): Promise<string> };

export class ReturnEvidenceAccessService {
  constructor(private readonly client: PrismaClient, private readonly storage: EvidenceStorage) {}

  private async files(session: Session, returnId: string, scope: "admin" | "customer") {
    if (session.status !== "ACTIVE" || !session.permissions.includes("returns:manage") || (scope === "admin" && !session.principal.roles.some((role) => ["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN"].includes(role)))) throw new ApiProblem(403, "RETURN_EVIDENCE_FORBIDDEN", "Return review access is required");
    const row = scope === "customer"
      ? await this.client.return.findFirst({ where: { id: returnId, userId: session.principal.userId }, select: { events: { where: { actorId: session.principal.userId, actorType: "customer" }, select: { actorId: true, metadata: true } } } })
      : await this.client.return.findUnique({ where: { id: returnId }, select: { events: { select: { actorId: true, metadata: true } } } });
    if (!row) throw new ApiProblem(404, "RETURN_NOT_FOUND", "Return not found");
    const sources = row.events.flatMap((event) => {
      const metadata = event.metadata;
      if (!event.actorId || !metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
      if (scope === "customer" && event.actorId !== session.principal.userId) return [];
      const keys = metadata.evidenceStorageKeys;
      if (!Array.isArray(keys)) return [];
      const storageKeys = keys.filter((key): key is string => typeof key === "string").slice(0, 5);
      return storageKeys.length ? [{ userId: event.actorId, storageKey: { in: storageKeys } }] : [];
    });
    if (!sources.length) return [];
    return this.client.mediaUpload.findMany({ where: { OR: sources, purpose: "return_evidence", visibility: "private", status: { in: ["uploaded", "processing", "ready"] } }, select: { id: true, storageKey: true, originalName: true, mimeType: true }, orderBy: { createdAt: "asc" } });
  }

  async list(session: Session, returnId: string, scope: "admin" | "customer" = "admin") {
    return (await this.files(session, returnId, scope)).map(({ id, originalName, mimeType }) => ({ id, name: originalName, mimeType }));
  }

  async access(session: Session, returnId: string, uploadId: string, download: boolean, scope: "admin" | "customer" = "admin") {
    const file = (await this.files(session, returnId, scope)).find((entry) => entry.id === uploadId);
    if (!file) throw new ApiProblem(404, "RETURN_EVIDENCE_NOT_FOUND", "Evidence is not attached to this return");
    const safeImage = ["image/jpeg", "image/png", "image/webp"].includes(file.mimeType);
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: scope, action: "return.evidence.accessed", resourceType: "return", resourceId: returnId, after: { uploadId, download: download || !safeImage } } });
    const url = await this.storage.createReadUrl(file.storageKey, expiresAt, download || !safeImage);
    return { url, expiresAt: expiresAt.toISOString() };
  }
}

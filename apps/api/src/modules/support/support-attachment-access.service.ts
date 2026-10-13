import type { Prisma, PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

type AttachmentStorage = { createReadUrl(key: string, expiresAt: Date, download: boolean): Promise<string> };
type StoredAttachment = { storageKey: string };
const staffRoles = new Set(["SUPPORT_AGENT", "OPERATIONS_ADMIN", "SUPER_ADMIN"]);

function storageKeys(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => item && typeof item === "object" && !Array.isArray(item) && typeof item.storageKey === "string" ? [item.storageKey] : []);
}

export class SupportAttachmentAccessService {
  constructor(private readonly client: PrismaClient, private readonly storage: AttachmentStorage) {}

  async access(session: Session, ticketId: string, uploadId: string, download: boolean) {
    if (session.status !== "ACTIVE" || !session.permissions.includes("support:manage")) throw new ApiProblem(403, "SUPPORT_ATTACHMENT_FORBIDDEN", "Support access is required");
    const isStaff = session.permissions.includes("admin:read") && session.principal.roles.some((role) => staffRoles.has(role));
    const ticket = await this.client.supportTicket.findFirst({ where: { id: ticketId, ...(isStaff ? {} : { userId: session.principal.userId }) }, select: { messages: { select: { attachments: true } } } });
    if (!ticket) throw new ApiProblem(404, "SUPPORT_TICKET_NOT_FOUND", "Support ticket not found");
    const attachedKeys = new Set(ticket.messages.flatMap((message) => storageKeys(message.attachments)));
    const upload = await this.client.mediaUpload.findFirst({ where: { id: uploadId, storageKey: { in: [...attachedKeys] }, purpose: "support", visibility: "private", status: { in: ["uploaded", "processing", "ready"] } }, select: { storageKey: true, mimeType: true } });
    if (!upload) throw new ApiProblem(404, "SUPPORT_ATTACHMENT_NOT_FOUND", "Attachment is not part of this ticket");
    const inlineImage = ["image/jpeg", "image/png", "image/webp"].includes(upload.mimeType);
    const forceDownload = download || !inlineImage;
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: isStaff ? "support" : "customer", action: "support.attachment.accessed", resourceType: "support_ticket", resourceId: ticketId, after: { uploadId, download: forceDownload } } });
    return { url: await this.storage.createReadUrl(upload.storageKey, expiresAt, forceDownload), expiresAt: expiresAt.toISOString() };
  }
}

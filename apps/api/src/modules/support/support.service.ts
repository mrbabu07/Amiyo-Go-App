import { Prisma, type PrismaClient } from "@prisma/client";
import type { CreateSupportTicket, Session, SupportMessageInput, SupportTicketStatusInput } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

const staffRoles = new Set(["SUPPORT_AGENT", "OPERATIONS_ADMIN", "SUPER_ADMIN"]);

function requireSupport(session: Session) {
  if (session.status !== "ACTIVE" || !session.permissions.includes("support:manage")) {
    throw new ApiProblem(403, "SUPPORT_FORBIDDEN", "Support access is not allowed");
  }
}

function requireSupportStaff(session: Session) {
  requireSupport(session);
  if (!session.permissions.includes("admin:read") || !session.principal.roles.some((role) => staffRoles.has(role))) {
    throw new ApiProblem(403, "SUPPORT_STAFF_REQUIRED", "Support staff access is required");
  }
}

const ticketInclude = { messages: { orderBy: { createdAt: "asc" as const } } };
type TicketRow = Awaited<ReturnType<PrismaClient["supportTicket"]["findFirstOrThrow"]>> & {
  messages: Array<{ id: string; senderId: string; body: string; attachments: Prisma.JsonValue; createdAt: Date }>;
};

type Attachment = { storageKey: string; name: string; mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" };
function attachments(value: Prisma.JsonValue): Attachment[] { if (!Array.isArray(value)) return []; return value.filter((item): item is Attachment => Boolean(item && typeof item === "object" && !Array.isArray(item) && typeof item.storageKey === "string" && typeof item.name === "string" && typeof item.mimeType === "string")); }

function present(row: TicketRow) {
  return {
    id: row.id,
    userId: row.userId,
    orderId: row.orderId,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assignedTo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messages: row.messages.map((message) => ({ ...message, attachments: attachments(message.attachments), createdAt: message.createdAt.toISOString() }))
  };
}

export class SupportService {
  constructor(private readonly client: PrismaClient) {}

  async listMine(session: Session) {
    requireSupport(session);
    const rows = await this.client.supportTicket.findMany({ where: { userId: session.principal.userId }, include: ticketInclude, orderBy: { updatedAt: "desc" }, take: 100 });
    return rows.map((row) => present(row));
  }

  async create(session: Session, input: CreateSupportTicket) {
    requireSupport(session);
    const verified = await this.verifiedAttachments(session.principal.userId, input.attachments);
    const row = await this.client.supportTicket.create({
      data: {
        userId: session.principal.userId,
        orderId: input.orderId ?? null,
        subject: input.subject,
        category: input.category,
        priority: input.priority,
        messages: { create: { senderId: session.principal.userId, body: input.message, attachments: verified } }
      },
      include: ticketInclude
    });
    return present(row);
  }

  async addMessage(session: Session, ticketId: string, input: SupportMessageInput) {
    requireSupport(session);
    const ticket = await this.client.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new ApiProblem(404, "SUPPORT_TICKET_NOT_FOUND", "Support ticket not found");
    const isStaff = session.permissions.includes("admin:read") && session.principal.roles.some((role) => staffRoles.has(role));
    if (ticket.userId !== session.principal.userId && !isStaff) throw new ApiProblem(403, "SUPPORT_TICKET_FORBIDDEN", "You cannot access this support ticket");
    const verified = await this.verifiedAttachments(session.principal.userId, input.attachments);
    await this.client.supportMessage.create({ data: { ticketId, senderId: session.principal.userId, body: input.body, attachments: verified } });
    const updated = await this.client.supportTicket.update({ where: { id: ticketId }, data: { updatedAt: new Date() }, include: ticketInclude });
    return present(updated);
  }

  async listAdmin(session: Session) {
    requireSupportStaff(session);
    const rows = await this.client.supportTicket.findMany({ include: ticketInclude, orderBy: [{ priority: "desc" }, { updatedAt: "desc" }], take: 200 });
    return rows.map((row) => present(row));
  }

  async updateStatus(session: Session, ticketId: string, input: SupportTicketStatusInput) {
    requireSupportStaff(session);
    const ticket = await this.client.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new ApiProblem(404, "SUPPORT_TICKET_NOT_FOUND", "Support ticket not found");
    const updated = await this.client.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: input.status,
        assignedTo: ticket.assignedTo ?? session.principal.userId,
        ...(input.note ? { messages: { create: { senderId: session.principal.userId, body: input.note } } } : {})
      },
      include: ticketInclude
    });
    return present(updated);
  }

  private async verifiedAttachments(userId: string, values: Attachment[]) {
    if (!values.length) return Prisma.JsonNull;
    const keys = values.map((item) => item.storageKey); const uploads = await this.client.mediaUpload.findMany({ where: { userId, purpose: "support", storageKey: { in: keys }, status: { in: ["uploaded", "processing", "ready"] } }, select: { storageKey: true } });
    if (uploads.length !== new Set(keys).size) throw new ApiProblem(400, "SUPPORT_ATTACHMENT_INVALID", "Every attachment must be a completed support upload owned by the sender");
    return values as Prisma.InputJsonValue;
  }
}

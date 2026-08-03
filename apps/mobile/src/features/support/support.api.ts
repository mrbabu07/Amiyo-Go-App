import { supportTicketSchema, type CreateSupportTicket, type SupportTicketStatusInput } from "@amiyo/contracts";
import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function request(user: User, path: string, init?: RequestInit) {
  const token = await user.getIdToken();
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null;
    throw new Error(problem?.detail || problem?.title || `Support request failed (${response.status})`);
  }
  return response.json() as Promise<unknown>;
}

export async function getMyTickets(user: User) { return supportTicketSchema.array().parse(await request(user, "/api/v2/support/tickets")); }
export async function createTicket(user: User, input: CreateSupportTicket) { return supportTicketSchema.parse(await request(user, "/api/v2/support/tickets", { method: "POST", body: JSON.stringify(input) })); }
export async function replyToTicket(user: User, id: string, body: string) { return supportTicketSchema.parse(await request(user, `/api/v2/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) })); }
export async function getAdminTickets(user: User) { return supportTicketSchema.array().parse(await request(user, "/api/v2/admin/support/tickets")); }
export async function updateTicketStatus(user: User, id: string, input: SupportTicketStatusInput) { return supportTicketSchema.parse(await request(user, `/api/v2/admin/support/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify(input) })); }

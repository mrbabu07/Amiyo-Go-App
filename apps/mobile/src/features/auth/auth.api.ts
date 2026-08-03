import { accountDeletionSchema, addressSchema, sessionSchema, type AccountDeletionInput, type AddressInput, type Session, type UpdateProfile } from "@amiyo/contracts";
import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function authenticatedRequest<T>(user: User, path: string, init?: RequestInit): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { title?: string } | null;
    throw new Error(problem?.title || `Request failed (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function createSession(user: User) {
  return sessionSchema.parse(await authenticatedRequest<Session>(user, "/api/v2/auth/session", { method: "POST" }));
}

export async function updateMyProfile(user: User, input: UpdateProfile) {
  return sessionSchema.parse(await authenticatedRequest<Session>(user, "/api/v2/me", { method: "PATCH", body: JSON.stringify(input) }));
}

export async function getMyAddresses(user: User) {
  return addressSchema.array().parse(await authenticatedRequest<unknown>(user, "/api/v2/me/addresses"));
}

export async function createMyAddress(user: User, input: AddressInput) {
  return addressSchema.parse(await authenticatedRequest<unknown>(user, "/api/v2/me/addresses", { method: "POST", body: JSON.stringify(input) }));
}

export async function getDeletionRequest(user: User) { const value = await authenticatedRequest<unknown>(user, "/api/v2/me/deletion-request"); return value === null ? null : accountDeletionSchema.parse(value); }
export async function requestAccountDeletion(user: User, input: AccountDeletionInput) { return accountDeletionSchema.parse(await authenticatedRequest<unknown>(user, "/api/v2/me/deletion-request", { method: "POST", body: JSON.stringify(input) })); }

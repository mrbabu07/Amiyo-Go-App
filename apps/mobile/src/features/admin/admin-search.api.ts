import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export type AdminSearchType = "order" | "vendor" | "product" | "customer" | "return" | "support";
export type AdminSearchResult = {
  id: string;
  type: AdminSearchType;
  title: string;
  subtitle: string;
  status: string;
  href: string;
  badges: Array<{ label: string; tone: "danger" | "neutral" | "success" }>;
  meta: { createdAt: string; updatedAt: string };
};
export type AdminSearchDetail = AdminSearchResult & {
  sections: Array<{ title: string; items: Array<{ label: string; value: string }> }>;
  actions: Array<{ label: string; path: string; variant: string }>;
};

async function request<T>(user: User, path: string) {
  const token = await user.getIdToken();
  const response = await fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null;
    throw new Error(problem?.detail || problem?.title || `Admin search failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function searchAdminResources(user: User, query: string) {
  return request<{ query: string; results: AdminSearchResult[]; total: number }>(user, `/api/v2/admin/workspace/search?q=${encodeURIComponent(query)}&limit=4&totalLimit=18`);
}

export function getAdminSearchDetail(user: User, result: AdminSearchResult) {
  return request<AdminSearchDetail>(user, `/api/v2/admin/workspace/search/${result.type}/${result.id}`);
}

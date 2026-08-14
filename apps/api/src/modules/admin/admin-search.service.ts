import { Prisma, type PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

export type AdminSearchType = "order" | "vendor" | "product" | "customer" | "return" | "support";
type SearchRow = { id: string; title: string; subtitle: string; status: string; createdAt: Date; updatedAt: Date };
type Result = { id: string; type: AdminSearchType; title: string; subtitle: string; status: string; href: string; badges: Array<{ label: string; tone: "danger" | "neutral" | "success" }>; meta: { createdAt: string; updatedAt: string } };
const supportedTypes: AdminSearchType[] = ["order", "vendor", "product", "customer", "return", "support"];
const hrefs: Record<AdminSearchType, (id: string) => string> = {
  order: (id) => `/admin/orders/${id}`, vendor: (id) => `/admin/vendors/${id}`, product: (id) => `/admin/products/edit/${id}`,
  customer: (id) => `/admin/customers?search=${id}`, return: (id) => `/admin/returns?search=${id}`, support: (id) => `/admin/support?search=${id}`
};

function requireAdmin(session: Session) { if (session.status !== "ACTIVE" || !session.permissions.includes("admin:read")) throw new ApiProblem(403, "ADMIN_REQUIRED", "Admin search access is required"); }
function tone(status: string): "danger" | "neutral" | "success" { const normalized = status.toUpperCase(); if (["FAILED", "REJECTED", "CANCELLED", "SUSPENDED"].includes(normalized)) return "danger"; if (["ACTIVE", "APPROVED", "DELIVERED", "CLOSED"].includes(normalized)) return "success"; return "neutral"; }

export class AdminSearchService {
  constructor(private readonly client: PrismaClient) {}

  async search(session: Session, query: string, requestedTypes: AdminSearchType[] = supportedTypes, limit = 5, totalLimit = 24) {
    requireAdmin(session); const value = query.trim(); if (!value) return { query: value, results: [], grouped: {}, total: 0 };
    const selected = requestedTypes.filter((type) => supportedTypes.includes(type)); const take = Math.min(Math.max(limit, 1), 10);
    const entries = await Promise.all(selected.map(async (type) => [type, await this.searchType(type, value, take)] as const));
    const grouped = Object.fromEntries(entries); const results = entries.flatMap(([, rows]) => rows).slice(0, Math.min(Math.max(totalLimit, 1), 50));
    return { query: value, results, grouped, total: entries.reduce((sum, [, rows]) => sum + rows.length, 0) };
  }

  async detail(session: Session, type: AdminSearchType, id: string) {
    requireAdmin(session); const result = (await this.searchType(type, id, 1)).find((item) => item.id === id); if (!result) throw new ApiProblem(404, "ADMIN_SEARCH_RESOURCE_NOT_FOUND", "Search resource not found");
    return { ...result, sections: [{ title: `${type[0]!.toUpperCase()}${type.slice(1)} details`, items: [{ label: "ID", value: result.id }, { label: "Title", value: result.title }, { label: "Summary", value: result.subtitle }, { label: "Status", value: result.status }, { label: "Created", value: result.meta.createdAt }, { label: "Updated", value: result.meta.updatedAt }] }], actions: [{ label: "Open workspace", path: result.href, variant: "primary" }] };
  }

  private async searchType(type: AdminSearchType, query: string, limit: number): Promise<Result[]> {
    const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const rows = type === "order" ? await this.client.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT o.id, o.order_number AS title, CONCAT_WS(' · ', COALESCE(up.display_name, u.normalized_email, 'Guest customer'), o.currency || ' ' || TO_CHAR(o.total_minor::numeric / 100, 'FM999G999G999D00')) AS subtitle, o.status::text AS status, o.created_at AS "createdAt", o.updated_at AS "updatedAt"
      FROM orders o LEFT JOIN users u ON u.id = o.user_id LEFT JOIN user_profiles up ON up.user_id = u.id LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE CONCAT_WS(' ', o.id::text, o.order_number, u.normalized_email, u.normalized_phone, up.display_name, oi.product_name_snapshot, oi.sku_snapshot) ILIKE ${pattern} ESCAPE '\\' GROUP BY o.id, up.display_name, u.normalized_email ORDER BY o.created_at DESC LIMIT ${limit}`)
      : type === "vendor" ? await this.client.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT v.id, v.display_name AS title, CONCAT_WS(' · ', v.legal_name, vs.name) AS subtitle, v.status::text AS status, v.created_at AS "createdAt", v.updated_at AS "updatedAt"
      FROM vendors v LEFT JOIN vendor_shops vs ON vs.vendor_id = v.id WHERE CONCAT_WS(' ', v.id::text, v.display_name, v.legal_name, vs.name, vs.slug) ILIKE ${pattern} ESCAPE '\\' GROUP BY v.id, vs.name ORDER BY v.created_at DESC LIMIT ${limit}`)
      : type === "product" ? await this.client.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT p.id, p.name AS title, CONCAT_WS(' · ', pv.sku, p.brand, vs.name) AS subtitle, p.status::text AS status, p.created_at AS "createdAt", p.updated_at AS "updatedAt"
      FROM products p LEFT JOIN product_variants pv ON pv.product_id = p.id LEFT JOIN vendor_shops vs ON vs.id = p.shop_id WHERE CONCAT_WS(' ', p.id::text, p.name, p.slug, p.brand, pv.sku, vs.name) ILIKE ${pattern} ESCAPE '\\' GROUP BY p.id, pv.sku, vs.name ORDER BY p.created_at DESC LIMIT ${limit}`)
      : type === "customer" ? await this.client.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT u.id, COALESCE(up.display_name, u.normalized_email, 'Unnamed account') AS title, CONCAT_WS(' · ', u.normalized_email, u.normalized_phone) AS subtitle, u.status AS status, u.created_at AS "createdAt", u.updated_at AS "updatedAt"
      FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE CONCAT_WS(' ', u.id::text, u.normalized_email, u.normalized_phone, up.display_name, up.first_name, up.last_name) ILIKE ${pattern} ESCAPE '\\' ORDER BY u.created_at DESC LIMIT ${limit}`)
      : type === "return" ? await this.client.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT r.id, 'Return ' || LEFT(r.id::text, 8) AS title, CONCAT_WS(' · ', o.order_number, r.reason_code, r.currency || ' ' || TO_CHAR(r.requested_minor::numeric / 100, 'FM999G999G999D00')) AS subtitle, r.status::text AS status, r.created_at AS "createdAt", r.updated_at AS "updatedAt"
      FROM returns r JOIN orders o ON o.id = r.order_id WHERE CONCAT_WS(' ', r.id::text, r.order_id::text, o.order_number, r.reason_code, r.reason_detail, r.status::text) ILIKE ${pattern} ESCAPE '\\' ORDER BY r.created_at DESC LIMIT ${limit}`)
      : await this.client.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT st.id, st.subject AS title, CONCAT_WS(' · ', COALESCE(up.display_name, u.normalized_email, 'Customer'), st.priority) AS subtitle, st.status AS status, st.created_at AS "createdAt", st.updated_at AS "updatedAt"
      FROM support_tickets st JOIN users u ON u.id = st.user_id LEFT JOIN user_profiles up ON up.user_id = u.id WHERE CONCAT_WS(' ', st.id::text, st.order_id::text, st.subject, st.status, st.priority, u.normalized_email, u.normalized_phone, up.display_name) ILIKE ${pattern} ESCAPE '\\' ORDER BY st.created_at DESC LIMIT ${limit}`);
    return rows.map((row) => ({ id: row.id, type, title: row.title, subtitle: row.subtitle, status: row.status, href: hrefs[type](row.id), badges: row.status ? [{ label: row.status, tone: tone(row.status) }] : [], meta: { createdAt: row.createdAt.toISOString().slice(0, 10), updatedAt: row.updatedAt.toISOString().slice(0, 10) } }));
  }
}

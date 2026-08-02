import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function argument(name: string, position: number) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : process.argv[position]; }
function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`; return JSON.stringify(value); }
const hydrate = (data: Record<string, unknown>) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === "string" && /Minor$/.test(key) && /^\d+$/.test(value) ? BigInt(value) : typeof value === "string" && /(At|Date)$/.test(key) && /^\d{4}-\d\d-\d\dT/.test(value) ? new Date(value) : value]));
async function main() {
  if (argument("--confirm", 3) !== "APPLY_REVIEWED_PLAN") throw new Error("Refusing database writes. Pass --confirm APPLY_REVIEWED_PLAN after reviewing reconciliation and rejects.");
  const planPath = resolve(argument("--plan", 2) || "migration/output/dry-run/load-plan.json"); const plan = JSON.parse(await readFile(planPath, "utf8")) as { digest: string; rejected: number; rows: Array<{ sourceCollection: string; legacyId: string; targetTable: string; targetId: string; data: Record<string, unknown> }> }; const expectedDigest = createHash("sha256").update(stable({ rows: plan.rows, rejectedRows: [] })).digest("hex"); if (plan.rejected !== 0 || plan.digest !== expectedDigest) throw new Error("Plan digest is invalid or the plan contains rejected rows");
  const database = new PrismaClient(); const groups = new Map<string, Record<string, unknown>[]>(); for (const row of plan.rows) groups.set(row.targetTable, [...(groups.get(row.targetTable) || []), hydrate(row.data)]);
  try {
  await database.$transaction(async (transaction) => {
    for (const table of ["users", "user_profiles", "user_roles", "categories", "vendors", "vendor_members", "vendor_shops", "products", "product_variants", "inventory_items", "orders", "vendor_orders", "order_items", "payments"]) {
      const data = groups.get(table); if (!data?.length) continue;
      if (table === "users") await transaction.user.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "user_profiles") await transaction.userProfile.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "user_roles") { const roles = await transaction.role.findMany({ select: { id: true, name: true } }); const roleIds = new Map(roles.map((role) => [role.name, role.id])); const assignments = data.map((item) => ({ userId: item.userId as string, roleId: roleIds.get(item.roleName as never), assignedAt: item.assignedAt as Date })); if (assignments.some((item) => !item.roleId)) throw new Error("Target role seed is incomplete"); await transaction.userRole.createMany({ data: assignments as never, skipDuplicates: true }); }
      else if (table === "categories") await transaction.category.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "vendors") await transaction.vendor.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "vendor_members") await transaction.vendorMember.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "vendor_shops") await transaction.vendorShop.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "products") await transaction.product.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "product_variants") await transaction.productVariant.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "inventory_items") await transaction.inventoryItem.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "orders") await transaction.order.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "vendor_orders") await transaction.vendorOrder.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "order_items") await transaction.orderItem.createMany({ data: data as never, skipDuplicates: true });
      else if (table === "payments") await transaction.payment.createMany({ data: data as never, skipDuplicates: true });
    }
  }, { timeout: 120_000 }); process.stdout.write(`${JSON.stringify({ applied: plan.rows.length, digest: plan.digest })}\n`);
  } finally { await database.$disconnect(); }
}
main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : error}\n`); process.exitCode = 1; });

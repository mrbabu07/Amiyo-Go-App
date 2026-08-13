import { Prisma, type PrismaClient } from "@prisma/client";
import type { CommissionRuleInput, Session, UpdateCommissionRule } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;
type CommissionItem = { productId: string; categoryId: string; quantity: number; unitPriceMinor: bigint };

function requireAdmin(session: Session, write = false) {
  const permission = write ? "admin:manage" : "admin:read";
  if (session.status !== "ACTIVE" || !session.permissions.includes(permission)) throw new ApiProblem(403, "ADMIN_ACCESS_REQUIRED", `${permission} access is required`);
}

function scope(vendorId: string | null, categoryId: string | null) {
  return vendorId && categoryId ? "VENDOR_CATEGORY" as const : vendorId ? "VENDOR" as const : categoryId ? "CATEGORY" as const : "GLOBAL" as const;
}

function status(effectiveFrom: Date, effectiveTo: Date | null) {
  const now = new Date();
  return effectiveFrom > now ? "SCHEDULED" as const : effectiveTo && effectiveTo <= now ? "ENDED" as const : "ACTIVE" as const;
}

function dto(rule: { id: string; vendorId: string | null; categoryId: string | null; rateBps: number; fixedMinor: bigint; currency: string; effectiveFrom: Date; effectiveTo: Date | null; version: number; vendor: { displayName: string } | null; category: { name: string } | null }) {
  return { id: rule.id, vendorId: rule.vendorId, vendorName: rule.vendor?.displayName ?? null, categoryId: rule.categoryId, categoryName: rule.category?.name ?? null, scope: scope(rule.vendorId, rule.categoryId), rateBps: rule.rateBps, fixedMinor: rule.fixedMinor.toString(), currency: "BDT" as const, effectiveFrom: rule.effectiveFrom.toISOString(), effectiveTo: rule.effectiveTo?.toISOString() ?? null, status: status(rule.effectiveFrom, rule.effectiveTo), version: rule.version };
}

function specificity(rule: { vendorId: string | null; categoryId: string | null }, vendorId: string, categoryId: string) {
  if (rule.vendorId === vendorId && rule.categoryId === categoryId) return 4;
  if (rule.vendorId === vendorId && !rule.categoryId) return 3;
  if (!rule.vendorId && rule.categoryId === categoryId) return 2;
  if (!rule.vendorId && !rule.categoryId) return 1;
  return 0;
}

export class CommissionService {
  constructor(private readonly client: PrismaClient) {}

  async list(session: Session) {
    requireAdmin(session);
    const rules = await this.client.commissionRule.findMany({ include: { vendor: true, category: true }, orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }] });
    return rules.map(dto);
  }

  async create(session: Session, input: CommissionRuleInput) {
    requireAdmin(session, true);
    await this.validateReferences(this.client, input);
    await this.assertNoOverlap(this.client, input);
    const rule = await this.client.$transaction(async (transaction) => {
      const created = await transaction.commissionRule.create({ data: { ...input, fixedMinor: BigInt(input.fixedMinor), effectiveFrom: new Date(input.effectiveFrom), effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null }, include: { vendor: true, category: true } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "admin.commission_rule.created", resourceType: "commission_rule", resourceId: created.id, after: JSON.parse(JSON.stringify(input)) } });
      return created;
    });
    return dto(rule);
  }

  async update(session: Session, id: string, input: UpdateCommissionRule) {
    requireAdmin(session, true);
    const before = await this.client.commissionRule.findUnique({ where: { id } });
    if (!before) throw new ApiProblem(404, "COMMISSION_RULE_NOT_FOUND", "Commission rule not found");
    await this.validateReferences(this.client, input);
    await this.assertNoOverlap(this.client, input, id);
    const result = await this.client.commissionRule.updateMany({ where: { id, version: input.expectedVersion }, data: { vendorId: input.vendorId, categoryId: input.categoryId, rateBps: input.rateBps, fixedMinor: BigInt(input.fixedMinor), currency: input.currency, effectiveFrom: new Date(input.effectiveFrom), effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null, version: { increment: 1 } } });
    if (!result.count) throw new ApiProblem(409, "COMMISSION_RULE_VERSION_CONFLICT", "Commission rule changed; refresh and try again");
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "admin.commission_rule.updated", resourceType: "commission_rule", resourceId: id, before: { version: before.version }, after: JSON.parse(JSON.stringify(input)) } });
    return dto(await this.client.commissionRule.findUniqueOrThrow({ where: { id }, include: { vendor: true, category: true } }));
  }

  async end(session: Session, id: string, expectedVersion: number) {
    requireAdmin(session, true);
    const endedAt = new Date();
    const result = await this.client.commissionRule.updateMany({ where: { id, version: expectedVersion, OR: [{ effectiveTo: null }, { effectiveTo: { gt: endedAt } }] }, data: { effectiveTo: endedAt, version: { increment: 1 } } });
    if (!result.count) throw new ApiProblem(409, "COMMISSION_RULE_END_CONFLICT", "Commission rule is already ended or changed");
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "admin.commission_rule.ended", resourceType: "commission_rule", resourceId: id, after: { endedAt: endedAt.toISOString() } } });
    return dto(await this.client.commissionRule.findUniqueOrThrow({ where: { id }, include: { vendor: true, category: true } }));
  }

  async calculateForVendorOrder(transaction: Prisma.TransactionClient, orderId: string, vendorId: string, items: CommissionItem[]) {
    const now = new Date();
    const categoryIds = [...new Set(items.map((item) => item.categoryId))];
    const rules = await transaction.commissionRule.findMany({ where: { currency: "BDT", effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }], AND: [{ OR: [{ vendorId }, { vendorId: null }] }, { OR: [{ categoryId: { in: categoryIds } }, { categoryId: null }] }] }, orderBy: { effectiveFrom: "desc" } });
    const totals = new Map<string, { amount: bigint; base: bigint; rule: typeof rules[number] }>();
    for (const item of items) {
      const rule = rules.map((candidate) => ({ candidate, score: specificity(candidate, vendorId, item.categoryId) })).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score || right.candidate.effectiveFrom.getTime() - left.candidate.effectiveFrom.getTime())[0]?.candidate;
      if (!rule) continue;
      const base = item.unitPriceMinor * BigInt(item.quantity);
      const current = totals.get(rule.id) ?? { amount: rule.fixedMinor, base: 0n, rule };
      current.base += base;
      current.amount += base * BigInt(rule.rateBps) / 10_000n;
      totals.set(rule.id, current);
    }
    const subtotal = items.reduce((sum, item) => sum + item.unitPriceMinor * BigInt(item.quantity), 0n);
    let remaining = subtotal;
    let commission = 0n;
    for (const entry of totals.values()) {
      const amount = entry.amount > remaining ? remaining : entry.amount;
      remaining -= amount;
      commission += amount;
      await transaction.commissionEntry.create({ data: { orderId, ruleId: entry.rule.id, amountMinor: amount, currency: entry.rule.currency, snapshot: { vendorId, categoryId: entry.rule.categoryId, rateBps: entry.rule.rateBps, fixedMinor: entry.rule.fixedMinor.toString(), commissionBaseMinor: entry.base.toString(), effectiveFrom: entry.rule.effectiveFrom.toISOString() } } });
    }
    return commission;
  }

  private async validateReferences(client: DatabaseClient, input: Pick<CommissionRuleInput, "vendorId" | "categoryId">) {
    if (input.vendorId && !await client.vendor.findUnique({ where: { id: input.vendorId }, select: { id: true } })) throw new ApiProblem(400, "COMMISSION_VENDOR_INVALID", "Selected vendor does not exist");
    if (input.categoryId && !await client.category.findUnique({ where: { id: input.categoryId }, select: { id: true } })) throw new ApiProblem(400, "COMMISSION_CATEGORY_INVALID", "Selected category does not exist");
  }

  private async assertNoOverlap(client: DatabaseClient, input: CommissionRuleInput, excludeId?: string) {
    const start = new Date(input.effectiveFrom); const end = input.effectiveTo ? new Date(input.effectiveTo) : null;
    const overlap = await client.commissionRule.findFirst({ where: { ...(excludeId ? { id: { not: excludeId } } : {}), vendorId: input.vendorId, categoryId: input.categoryId, effectiveFrom: { lt: end ?? new Date("9999-12-31T23:59:59.999Z") }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: start } }] }, select: { id: true } });
    if (overlap) throw new ApiProblem(409, "COMMISSION_RULE_OVERLAP", "This scope already has an overlapping commission rule");
  }
}

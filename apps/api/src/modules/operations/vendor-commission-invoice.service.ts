import { Prisma, type PrismaClient } from "@prisma/client";
import { vendorStatementQuerySchema, type Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";
import { statementPeriod } from "./vendor-statement.service.js";

export class VendorCommissionInvoiceService {
  constructor(private readonly client: PrismaClient) {}

  async invoice(session: Session, input: unknown) {
    if (session.status !== "ACTIVE" || !session.permissions.includes("finance:read")) throw new ApiProblem(403, "VENDOR_FINANCE_FORBIDDEN", "Vendor finance permission is required");
    const query = vendorStatementQuerySchema.parse(input);
    const vendorId = query.vendorId ?? session.principal.vendorIds[0];
    if (!vendorId || !session.principal.vendorIds.includes(vendorId)) throw new ApiProblem(403, "VENDOR_FINANCE_FORBIDDEN", "This vendor is not in your workspace");
    const { start, end } = statementPeriod(query.month);
    return this.client.$transaction(async (transaction) => {
      const vendor = await transaction.vendor.findUnique({ where: { id: vendorId }, select: { displayName: true } });
      if (!vendor) throw new ApiProblem(404, "VENDOR_NOT_FOUND", "Vendor not found");
      const wallet = await transaction.vendorWallet.findUnique({ where: { vendorId } });
      const currency = wallet?.currency ?? "BDT";
      const createdAt = { gte: start, lt: end };
      const settlements = wallet ? await transaction.vendorLedgerEntry.findMany({ where: { walletId: wallet.id, currency, entryType: "ORDER_SETTLEMENT", direction: "CREDIT", createdAt }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 5001 }) : [];
      const reversals = await transaction.financialLedgerEntry.findMany({ where: { accountType: "platform_commission", accountId: vendorId, currency, direction: "DEBIT", entryType: "COMMISSION_REVERSAL", createdAt }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 5001 });
      if (settlements.length + reversals.length > 5000) throw new ApiProblem(422, "COMMISSION_INVOICE_TOO_LARGE", "This period exceeds 5000 entries; no partial invoice was generated");
      const money = (amount: bigint) => ({ amountMinor: amount.toString(), currency });
      const entries = settlements.map((entry) => {
        const snapshot = entry.metadata as { commissionMinor?: unknown; vendorId?: unknown } | null;
        if (snapshot?.vendorId !== vendorId || typeof snapshot.commissionMinor !== "string" || !/^\d+$/.test(snapshot.commissionMinor)) throw new ApiProblem(409, "COMMISSION_SNAPSHOT_MISSING", "A legacy settlement is missing its commission snapshot; reconciliation is required");
        return { id: entry.id, createdAt: entry.createdAt.toISOString(), referenceId: entry.referenceId, kind: "COMMISSION" as "COMMISSION" | "COMMISSION_REVERSAL", amount: money(BigInt(snapshot.commissionMinor)) };
      });
      entries.push(...reversals.map((entry) => ({ id: entry.id, createdAt: entry.createdAt.toISOString(), referenceId: entry.referenceId, kind: "COMMISSION_REVERSAL" as const, amount: money(entry.amountMinor) })));
      entries.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
      const earned = entries.reduce((total, entry) => total + (entry.kind === "COMMISSION" ? BigInt(entry.amount.amountMinor) : 0n), 0n);
      const reversed = reversals.reduce((total, entry) => total + entry.amountMinor, 0n);
      return { vendorId, vendorName: vendor.displayName, month: query.month, reference: `COM-${vendorId}-${query.month}`, generatedAt: new Date().toISOString(), earned: money(earned), reversed: money(reversed), net: money(earned - reversed), entries };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
  }
}

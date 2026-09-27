import { Prisma, type PrismaClient } from "@prisma/client";
import { vendorStatementQuerySchema, type Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

export function statementPeriod(month: string) {
  vendorStatementQuerySchema.parse({ month });
  const [year, monthNumber] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(year!, monthNumber! - 1, 1, -6)), end: new Date(Date.UTC(year!, monthNumber!, 1, -6)) };
}

export class VendorStatementService {
  constructor(private readonly client: PrismaClient) {}

  async statement(session: Session, input: unknown) {
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
      const prior = wallet ? await transaction.vendorLedgerEntry.groupBy({ by: ["direction"], where: { walletId: wallet.id, currency, createdAt: { lt: start } }, _sum: { amountMinor: true } }) : [];
      const rows = wallet ? await transaction.vendorLedgerEntry.findMany({ where: { walletId: wallet.id, currency, createdAt: { gte: start, lt: end } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 5001 }) : [];
      if (rows.length > 5000) throw new ApiProblem(422, "STATEMENT_TOO_LARGE", "This month exceeds 5000 entries; request a finance-assisted export. No partial statement was generated.");
      const opening = prior.reduce((total, row) => total + (row.direction === "CREDIT" ? row._sum.amountMinor ?? 0n : -(row._sum.amountMinor ?? 0n)), 0n);
      const credits = rows.reduce((total, row) => total + (row.direction === "CREDIT" ? row.amountMinor : 0n), 0n);
      const debits = rows.reduce((total, row) => total + (row.direction === "DEBIT" ? row.amountMinor : 0n), 0n);
      const money = (amount: bigint) => ({ amountMinor: amount.toString(), currency });
      return { vendorId, vendorName: vendor.displayName, month: query.month, timezone: "Asia/Dhaka" as const, periodStart: start.toISOString(), periodEnd: end.toISOString(), generatedAt: new Date().toISOString(), opening: money(opening), credits: money(credits), debits: money(debits), closing: money(opening + credits - debits), entries: rows.map((row) => ({ id: row.id, direction: row.direction, amount: money(row.amountMinor), entryType: row.entryType, referenceType: row.referenceType, referenceId: row.referenceId, createdAt: row.createdAt.toISOString() })) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
  }
}

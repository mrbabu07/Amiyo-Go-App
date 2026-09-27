import { Prisma, type PrismaClient } from "@prisma/client";
import { vendorStatementQuerySchema, type Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";
import { statementPeriod } from "./vendor-statement.service.js";

export class VendorChargeReportService {
  constructor(private readonly client: PrismaClient) {}

  async report(session: Session, input: unknown) {
    if (session.status !== "ACTIVE" || !session.permissions.includes("finance:read")) throw new ApiProblem(403, "VENDOR_FINANCE_FORBIDDEN", "Vendor finance permission is required");
    const query = vendorStatementQuerySchema.parse(input);
    const vendorId = query.vendorId ?? session.principal.vendorIds[0];
    if (!vendorId || !session.principal.vendorIds.includes(vendorId)) throw new ApiProblem(403, "VENDOR_FINANCE_FORBIDDEN", "This vendor is not in your workspace");
    const { start, end } = statementPeriod(query.month);
    return this.client.$transaction(async (transaction) => {
      const vendor = await transaction.vendor.findUnique({ where: { id: vendorId }, select: { displayName: true } });
      if (!vendor) throw new ApiProblem(404, "VENDOR_NOT_FOUND", "Vendor not found");
      const rows = await transaction.vendorOrder.findMany({
        where: { vendorId, createdAt: { gte: start, lt: end } },
        select: { id: true, status: true, createdAt: true, subtotalMinor: true, discountMinor: true, commissionMinor: true, order: { select: { orderNumber: true, currency: true } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 5001
      });
      if (rows.length > 5000) throw new ApiProblem(422, "CHARGE_REPORT_TOO_LARGE", "This month exceeds 5000 orders; request a finance-assisted export. No partial report was generated.");
      if (rows.some((row) => row.order.currency !== "BDT")) throw new ApiProblem(422, "CHARGE_REPORT_CURRENCY_UNSUPPORTED", "This report supports BDT only; request a separate currency reconciliation.");
      const orders = rows.map((row) => ({ id: row.id, orderNumber: row.order.orderNumber, status: row.status, createdAt: row.createdAt.toISOString(), subtotalMinor: row.subtotalMinor.toString(), discountMinor: row.discountMinor.toString(), commissionMinor: row.commissionMinor.toString(), included: row.status !== "CANCELLED" && row.status !== "REJECTED" }));
      const commission = orders.reduce((total, row) => total + (row.included ? BigInt(row.commissionMinor) : 0n), 0n);
      return { vendorId, vendorName: vendor.displayName, month: query.month, generatedAt: new Date().toISOString(), periodStart: start.toISOString(), periodEnd: end.toISOString(), basis: "ORDER_CREATED_AT" as const, currency: "BDT" as const, commissionMinor: commission.toString(), orders };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
  }
}

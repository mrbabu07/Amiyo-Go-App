import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import type { SslCommerzGateway } from "../commerce/sslcommerz.gateway.js";

export async function initiateRefundOnce(client: PrismaClient, gateway: SslCommerzGateway, input: { orderId: string; expectedVersion: number; bankTransactionId: string; amountMinor: bigint; reason: string }) {
  const scope = "sslcommerz-refund-initiation";
  const key = `${input.orderId}:${input.expectedVersion}`;
  const hash = createHash("sha256").update(JSON.stringify({ ...input, amountMinor: input.amountMinor.toString() })).digest("hex");
  const claim = await withSerializableTransaction(client, async (transaction) => {
    const prior = await transaction.idempotencyRecord.findUnique({ where: { scope_key: { scope, key } } });
    if (prior) {
      if (prior.requestHash !== hash) throw new ApiProblem(409, "REFUND_INITIATION_CONFLICT", "Another refund request owns this order version; reconcile it first");
      const response = prior.response as { refundRefId?: string } | null;
      if (!response?.refundRefId) throw new ApiProblem(409, "REFUND_INITIATION_UNCERTAIN", "Refund initiation is in progress or its outcome is unknown. Reconcile with the provider; do not resubmit a new refund.");
      return response.refundRefId;
    }
    const previous = await transaction.idempotencyRecord.findMany({ where: { scope, key: { startsWith: `${input.orderId}:` } }, select: { response: true } });
    for (const record of previous) {
      const response = record.response as { refundRefId?: string } | null;
      const completed = response?.refundRefId ? await transaction.refund.findUnique({ where: { providerRefundId: response.refundRefId }, select: { status: true } }) : null;
      if (completed?.status !== "completed") throw new ApiProblem(409, "REFUND_INITIATION_UNCERTAIN", "A previous provider refund on this order still needs reconciliation");
    }
    await transaction.idempotencyRecord.create({ data: { scope, key, requestHash: hash, response: { state: "INITIATING" }, expiresAt: null } });
    return null;
  });
  if (claim) return { refundRefId: claim };
  const initiated = await gateway.initiateRefund({ bankTransactionId: input.bankTransactionId, refundTransactionId: `REF${createHash("sha256").update(key).digest("hex").slice(0, 27)}`, amountMinor: input.amountMinor, reason: input.reason, referenceId: input.orderId });
  await client.idempotencyRecord.update({ where: { scope_key: { scope, key } }, data: { response: { state: "INITIATED", refundRefId: initiated.refundRefId } } });
  return { refundRefId: initiated.refundRefId };
}

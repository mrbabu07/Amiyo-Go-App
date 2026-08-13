import { Prisma, type PrismaClient } from "@prisma/client";
import type { CheckoutResult, Session } from "@amiyo/contracts";
import { z } from "zod";
import { ApiProblem } from "../../middleware/api-problem.js";
import { PaymentWebhookService } from "./payment-webhook.service.js";
import { SslCommerzGateway } from "./sslcommerz.gateway.js";

const notificationSchema = z.object({ status: z.string().optional(), tran_id: z.string().min(1), val_id: z.string().optional(), value_a: z.string().uuid().optional(), amount: z.string().optional(), currency: z.string().optional() }).passthrough();

function amountMinor(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new ApiProblem(400, "SSLCOMMERZ_AMOUNT_INVALID", "SSLCommerz returned an invalid amount");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export class SslCommerzPaymentService {
  private readonly webhook: PaymentWebhookService;
  constructor(private readonly client: PrismaClient, private readonly gateway = new SslCommerzGateway()) { this.webhook = new PaymentWebhookService(client); }

  async attachCheckoutSession(result: CheckoutResult, session: Session, addressId: string, idempotencyKey: string) {
    if (result.payment.method !== "SSLCOMMERZ") return result;
    if (result.actionUrl) {
      const current = new URL(result.actionUrl);
      if (current.protocol === "https:" && current.hostname.endsWith("sslcommerz.com")) return result;
    }
    if (!session.email) throw new ApiProblem(400, "SSLCOMMERZ_EMAIL_REQUIRED", "Add an email address before paying with SSLCommerz");
    const address = await this.client.address.findFirst({ where: { id: addressId, userId: session.principal.userId } });
    if (!address) throw new ApiProblem(404, "ADDRESS_NOT_FOUND", "Delivery address not found");
    try {
      const gateway = await this.gateway.initiate({
        paymentId: result.payment.id,
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        amountMinor: BigInt(result.payment.amount.amountMinor),
        currency: result.payment.amount.currency,
        customerName: session.profile.displayName || [session.profile.firstName, session.profile.lastName].filter(Boolean).join(" ") || address.recipientName,
        customerEmail: session.email,
        customerPhone: session.phone || address.phone,
        addressLine1: address.line1,
        addressLine2: address.line2,
        city: address.district,
        state: address.division,
        postcode: address.postalCode,
        itemCount: result.order.vendorOrders.flatMap((order) => order.items).reduce((sum, item) => sum + item.quantity, 0)
      });
      const next: CheckoutResult = { ...result, actionUrl: gateway.actionUrl, instructions: "Complete payment securely on the SSLCommerz sandbox checkout." };
      await this.client.$transaction([
        this.client.payment.update({ where: { id: result.payment.id }, data: { providerTransactionId: gateway.transactionId } }),
        this.client.paymentAttempt.update({ where: { paymentId_attemptNumber: { paymentId: result.payment.id, attemptNumber: 1 } }, data: { status: "requires_action", responseSnapshot: { sessionKey: gateway.sessionKey, transactionId: gateway.transactionId, actionUrl: gateway.actionUrl } } }),
        this.client.idempotencyRecord.update({ where: { scope_key: { scope: `checkout:${session.principal.userId}`, key: idempotencyKey } }, data: { response: next as unknown as Prisma.InputJsonValue } })
      ]);
      return next;
    } catch (error) {
      await this.client.paymentAttempt.updateMany({ where: { paymentId: result.payment.id, attemptNumber: 1 }, data: { status: "session_failed", errorCode: error instanceof ApiProblem ? error.code : "SSLCOMMERZ_SESSION_FAILED", responseSnapshot: { error: error instanceof Error ? error.message.slice(0, 500) : "SSLCommerz session failed" } } });
      throw error;
    }
  }

  async receive(payload: unknown) {
    const notification = notificationSchema.parse(payload);
    if (!notification.val_id || !["VALID", "VALIDATED"].includes(notification.status || "")) return { received: true, pending: true, paymentId: notification.value_a ?? null };
    const validation = await this.gateway.validate(notification.val_id);
    if (!["VALID", "VALIDATED"].includes(validation.status)) throw new ApiProblem(409, "SSLCOMMERZ_PAYMENT_INVALID", "SSLCommerz did not validate this payment");
    if (validation.tran_id !== notification.tran_id) throw new ApiProblem(409, "SSLCOMMERZ_TRANSACTION_MISMATCH", "SSLCommerz transaction ID does not match");
    const payment = notification.value_a
      ? await this.client.payment.findUnique({ where: { id: notification.value_a }, include: { order: { include: { invoice: true } } } })
      : await this.client.payment.findUnique({ where: { providerTransactionId: notification.tran_id }, include: { order: { include: { invoice: true } } } });
    if (!payment || payment.provider !== "sslcommerz") throw new ApiProblem(404, "PAYMENT_NOT_FOUND", "SSLCommerz payment not found");
    if (payment.providerTransactionId !== notification.tran_id) throw new ApiProblem(409, "SSLCOMMERZ_TRANSACTION_MISMATCH", "Payment transaction ID does not match");
    const validatedAmount = amountMinor(validation.amount);
    if (validatedAmount !== payment.amountMinor) throw new ApiProblem(409, "PAYMENT_AMOUNT_MISMATCH", "SSLCommerz amount does not match the order");
    const currency = validation.currency || validation.currency_type || notification.currency;
    if (currency && currency !== payment.currency) throw new ApiProblem(409, "PAYMENT_CURRENCY_MISMATCH", "SSLCommerz currency does not match the order");
    if (String(validation.risk_level ?? "0") === "1") {
      await this.client.paymentVerification.upsert({ where: { paymentId_transactionRef: { paymentId: payment.id, transactionRef: validation.val_id } }, create: { paymentId: payment.id, transactionRef: validation.val_id, status: "risk_hold" }, update: { status: "risk_hold" } });
      return { received: true, pending: true, held: true, paymentId: payment.id };
    }
    await this.webhook.process("sslcommerz", { eventId: `sslcommerz:${validation.val_id}`, paymentId: payment.id, status: "CAPTURED", transactionId: validation.tran_id, amountMinor: validatedAmount.toString() });
    return { received: true, pending: false, held: false, paymentId: payment.id, orderId: payment.orderId, orderNumber: payment.order.orderNumber, totalMinor: payment.amountMinor.toString(), invoice: payment.order.invoice?.number ?? "" };
  }

  redirectUrl(result: Awaited<ReturnType<SslCommerzPaymentService["receive"]>>, outcome: string) {
    const base = (process.env.APP_PUBLIC_URL || process.env.API_PUBLIC_URL || "http://localhost:8081").replace(/\/$/, "");
    if (!("orderId" in result) || !result.orderId) return `${base}/order-confirmation?payment=${encodeURIComponent(outcome)}`;
    const query = new URLSearchParams({ orderId: result.orderId, orderNumber: result.orderNumber, totalMinor: result.totalMinor, payment: outcome, invoice: result.invoice });
    return `${base}/order-confirmation?${query}`;
  }
}

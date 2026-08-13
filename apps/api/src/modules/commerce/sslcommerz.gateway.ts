import { z } from "zod";
import { ApiProblem } from "../../middleware/api-problem.js";

const sessionSchema = z.object({ status: z.string(), failedreason: z.string().optional(), sessionkey: z.string().optional(), GatewayPageURL: z.string().optional() });
const validationSchema = z.object({ status: z.string(), tran_id: z.string(), val_id: z.string(), amount: z.string(), currency: z.string().optional(), currency_type: z.string().optional(), risk_level: z.union([z.string(), z.number()]).optional(), bank_tran_id: z.string().optional() }).passthrough();

type GatewayInput = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amountMinor: bigint;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postcode?: string | null;
  itemCount: number;
};

export class SslCommerzGateway {
  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly apiPublicUrl: string;
  private readonly sandbox: boolean;

  constructor(private readonly fetcher: typeof fetch = fetch, env: NodeJS.ProcessEnv = process.env) {
    this.storeId = env.SSLCOMMERZ_STORE_ID || "";
    this.storePassword = env.SSLCOMMERZ_STORE_PASSWORD || "";
    this.apiPublicUrl = (env.API_PUBLIC_URL || "").replace(/\/$/, "");
    this.sandbox = env.SSLCOMMERZ_SANDBOX !== "false";
  }

  configured() { return Boolean(this.storeId && this.storePassword && this.apiPublicUrl); }

  transactionId(paymentId: string) { return `AMY${paymentId.replaceAll("-", "").slice(0, 27)}`; }

  async initiate(input: GatewayInput) {
    this.requireConfiguration();
    const callback = `${this.apiPublicUrl}/api/v2/payments/sslcommerz`;
    const body = new URLSearchParams({
      store_id: this.storeId,
      store_passwd: this.storePassword,
      total_amount: (Number(input.amountMinor) / 100).toFixed(2),
      currency: input.currency,
      tran_id: this.transactionId(input.paymentId),
      success_url: `${callback}/success`,
      fail_url: `${callback}/fail`,
      cancel_url: `${callback}/cancel`,
      ipn_url: `${callback}/ipn`,
      cus_name: input.customerName,
      cus_email: input.customerEmail,
      cus_add1: input.addressLine1,
      cus_add2: input.addressLine2 || input.addressLine1,
      cus_city: input.city,
      cus_state: input.state,
      cus_postcode: input.postcode || "0000",
      cus_country: "Bangladesh",
      cus_phone: input.customerPhone,
      shipping_method: "YES",
      ship_name: input.customerName,
      ship_add1: input.addressLine1,
      ship_add2: input.addressLine2 || input.addressLine1,
      ship_city: input.city,
      ship_state: input.state,
      ship_postcode: input.postcode || "0000",
      ship_country: "Bangladesh",
      product_name: `Amiyo-Go order ${input.orderNumber}`,
      product_category: "marketplace",
      product_profile: "general",
      num_of_item: String(input.itemCount),
      value_a: input.paymentId,
      value_b: input.orderId
    });
    const response = await this.fetcher(`${this.baseUrl()}/gwprocess/v4/api.php`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new ApiProblem(502, "SSLCOMMERZ_UNAVAILABLE", `SSLCommerz session request failed (${response.status})`);
    const result = sessionSchema.parse(await response.json());
    if (result.status !== "SUCCESS" || !result.GatewayPageURL || !result.sessionkey) throw new ApiProblem(502, "SSLCOMMERZ_SESSION_FAILED", result.failedreason || "SSLCommerz did not create a payment session");
    const redirect = new URL(result.GatewayPageURL);
    if (redirect.protocol !== "https:" || !redirect.hostname.endsWith("sslcommerz.com")) throw new ApiProblem(502, "SSLCOMMERZ_INVALID_REDIRECT", "SSLCommerz returned an invalid payment URL");
    return { actionUrl: redirect.toString(), sessionKey: result.sessionkey, transactionId: this.transactionId(input.paymentId) };
  }

  async validate(validationId: string) {
    this.requireConfiguration();
    const query = new URLSearchParams({ val_id: validationId, store_id: this.storeId, store_passwd: this.storePassword, v: "1", format: "json" });
    const response = await this.fetcher(`${this.baseUrl()}/validator/api/validationserverAPI.php?${query}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new ApiProblem(502, "SSLCOMMERZ_VALIDATION_UNAVAILABLE", `SSLCommerz validation failed (${response.status})`);
    return validationSchema.parse(await response.json());
  }

  private baseUrl() { return this.sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com"; }
  private requireConfiguration() { if (!this.configured()) throw new ApiProblem(503, "SSLCOMMERZ_NOT_CONFIGURED", "SSLCommerz credentials and API public URL are required"); }
}

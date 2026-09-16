import { createHmac, timingSafeEqual } from "node:crypto";

const PARCEL_VERSION = "AGP2";
const INVOICE_VERSION = "AGI1";
const SIGNATURE_LENGTH = 22;
const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60;
const LOCAL_SECRET = "amiyo-local-document-qr-signing-secret-change-before-production";

type BuildOptions = { now?: Date; secret?: string; ttlSeconds?: number };

export type ParcelQrClaims = {
  type: "parcel";
  orderId: string;
  vendorId: string;
  vendorOrderId: string;
  trackingNumber: string;
  paymentMode: "C" | "P" | "U";
  paymentStatus: string;
  orderStatus: string;
  amountMinor: string;
  currency: string;
  itemCount: number;
  quantity: number;
  expiresAt: string;
};

export type InvoiceQrClaims = {
  type: "invoice";
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  totalMinor: string;
  currency: string;
  issuedAt: string;
  expiresAt: string;
};

export type DocumentQrVerification =
  | { valid: true; claims: ParcelQrClaims | InvoiceQrClaims }
  | { valid: false; reason: "EXPIRED" | "INVALID_FORMAT" | "INVALID_SIGNATURE" | "UNSUPPORTED_VERSION" };

function signingSecret(override?: string) {
  const secret = override ?? process.env.PARCEL_QR_SIGNING_SECRET;
  if (secret) return secret;
  if (["staging", "production"].includes(process.env.NODE_ENV ?? "development")) throw new Error("PARCEL_QR_SIGNING_SECRET is required outside local development");
  return LOCAL_SECRET;
}

function ttlSeconds(override?: number) {
  if (override) return override;
  const configured = Number(process.env.PARCEL_QR_TTL_SECONDS);
  return Number.isInteger(configured) && configured >= 60 ? configured : DEFAULT_TTL_SECONDS;
}

function encode(value: string | number) { return encodeURIComponent(String(value)); }
function decode(value: string) { return decodeURIComponent(value); }
function signature(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("base64url").slice(0, SIGNATURE_LENGTH); }
function expiresAt(options: BuildOptions) { return Math.floor((options.now ?? new Date()).getTime() / 1000) + ttlSeconds(options.ttlSeconds); }
function amountDecimal(amountMinor: string) {
  if (!/^\d+$/.test(amountMinor)) throw new Error("QR amount must be a non-negative minor-unit integer");
  const padded = amountMinor.padStart(3, "0");
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
}
function amountMinor(decimal: string) {
  if (!/^\d+\.\d{2}$/.test(decimal)) throw new Error("Invalid QR amount");
  const [whole, fraction] = decimal.split(".");
  return `${BigInt(whole!)}${fraction}`.replace(/^0+(?=\d)/, "");
}

function signedPayload(version: string, fields: Array<[string, string | number]>, secret: string) {
  const unsigned = [version, ...fields.map(([key, value]) => `${key}=${encode(value)}`)].join("|");
  return `${unsigned}|H=${signature(unsigned, secret)}`;
}

export function buildParcelQrPayload(input: Omit<ParcelQrClaims, "type" | "expiresAt">, options: BuildOptions = {}) {
  return signedPayload(PARCEL_VERSION, [
    ["O", input.orderId], ["V", input.vendorId], ["P", input.vendorOrderId], ["T", input.trackingNumber],
    ["M", input.paymentMode], ["S", input.paymentStatus], ["F", input.orderStatus], ["A", amountDecimal(input.amountMinor)],
    ["C", input.currency], ["I", input.itemCount], ["Q", input.quantity], ["X", expiresAt(options)]
  ], signingSecret(options.secret));
}

export function buildInvoiceQrPayload(input: Omit<InvoiceQrClaims, "type" | "expiresAt">, options: BuildOptions = {}) {
  return signedPayload(INVOICE_VERSION, [
    ["I", input.invoiceId], ["N", input.invoiceNumber], ["O", input.orderId], ["R", input.orderNumber],
    ["A", amountDecimal(input.totalMinor)], ["C", input.currency], ["D", input.issuedAt], ["X", expiresAt(options)]
  ], signingSecret(options.secret));
}

function parse(payload: string) {
  if (payload.length > 2000) throw new Error("INVALID_FORMAT");
  const parts = payload.split("|");
  const version = parts.shift();
  const signaturePart = parts.pop();
  if (!version || !signaturePart?.startsWith("H=")) throw new Error("INVALID_FORMAT");
  const values = new Map<string, string>();
  for (const part of parts) {
    const separator = part.indexOf("=");
    if (separator < 1) throw new Error("INVALID_FORMAT");
    const key = part.slice(0, separator);
    if (values.has(key)) throw new Error("INVALID_FORMAT");
    values.set(key, decode(part.slice(separator + 1)));
  }
  return { version, values, suppliedSignature: signaturePart.slice(2), unsigned: [version, ...parts].join("|") };
}

function required(values: Map<string, string>, key: string) {
  const value = values.get(key);
  if (value === undefined || value === "") throw new Error("INVALID_FORMAT");
  return value;
}

function positiveInteger(values: Map<string, string>, key: string) {
  const value = Number(required(values, key));
  if (!Number.isInteger(value) || value < 0) throw new Error("INVALID_FORMAT");
  return value;
}

export function verifyDocumentQrPayload(payload: string, options: Pick<BuildOptions, "now" | "secret"> = {}): DocumentQrVerification {
  try {
    const parsed = parse(payload);
    if (![PARCEL_VERSION, INVOICE_VERSION].includes(parsed.version)) return { valid: false, reason: "UNSUPPORTED_VERSION" };
    const expected = signature(parsed.unsigned, signingSecret(options.secret));
    const suppliedBuffer = Buffer.from(parsed.suppliedSignature);
    const expectedBuffer = Buffer.from(expected);
    if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return { valid: false, reason: "INVALID_SIGNATURE" };
    const expiry = positiveInteger(parsed.values, "X");
    const now = Math.floor((options.now ?? new Date()).getTime() / 1000);
    if (expiry <= now) return { valid: false, reason: "EXPIRED" };
    const expires = new Date(expiry * 1000).toISOString();
    if (parsed.version === PARCEL_VERSION) {
      const mode = required(parsed.values, "M");
      if (!["C", "P", "U"].includes(mode)) return { valid: false, reason: "INVALID_FORMAT" };
      return { valid: true, claims: { type: "parcel", orderId: required(parsed.values, "O"), vendorId: required(parsed.values, "V"), vendorOrderId: required(parsed.values, "P"), trackingNumber: required(parsed.values, "T"), paymentMode: mode as ParcelQrClaims["paymentMode"], paymentStatus: required(parsed.values, "S"), orderStatus: required(parsed.values, "F"), amountMinor: amountMinor(required(parsed.values, "A")), currency: required(parsed.values, "C"), itemCount: positiveInteger(parsed.values, "I"), quantity: positiveInteger(parsed.values, "Q"), expiresAt: expires } };
    }
    return { valid: true, claims: { type: "invoice", invoiceId: required(parsed.values, "I"), invoiceNumber: required(parsed.values, "N"), orderId: required(parsed.values, "O"), orderNumber: required(parsed.values, "R"), totalMinor: amountMinor(required(parsed.values, "A")), currency: required(parsed.values, "C"), issuedAt: required(parsed.values, "D"), expiresAt: expires } };
  } catch (error) {
    const reason = error instanceof Error && error.message === "UNSUPPORTED_VERSION" ? "UNSUPPORTED_VERSION" : "INVALID_FORMAT";
    return { valid: false, reason };
  }
}

import { parseApiEnv, parseWorkerEnv } from "@amiyo/config";

try {
  const api = parseApiEnv(process.env);
  const worker = parseWorkerEnv(process.env);
  console.log(JSON.stringify({ status: "ready", environment: api.NODE_ENV, api: { publicProtocol: new URL(api.API_PUBLIC_URL).protocol, corsOrigins: api.CORS_ORIGINS?.split(",").filter(Boolean).length ?? 0, firebaseMode: api.FIREBASE_USE_APPLICATION_DEFAULT === "true" ? "application-default" : "service-account", sslCommerz: api.SSLCOMMERZ_STORE_ID ? (api.SSLCOMMERZ_SANDBOX === "true" ? "sandbox" : "live") : "disabled" }, worker: { deliveryProvider: Boolean(worker.AMIYO_DELIVERY_API_URL), emailProvider: Boolean(worker.EMAIL_PROVIDER) } }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

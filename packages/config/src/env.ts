import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "staging", "production"]).default("development");
const optionalUrlSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional());
const optionalSecretSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().min(12).optional());
const optionalSigningSecretSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional());
const optionalStringSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().optional());
const optionalEmailSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional());

const apiEnvObject = z.object({
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.string().url(),
  APP_PUBLIC_URL: optionalUrlSchema,
  CORS_ORIGINS: optionalStringSchema,
  DATABASE_URL: z.string().url(),
  DIRECT_URL: optionalUrlSchema,
  REDIS_URL: z.string().url(),
  FIREBASE_PROJECT_ID: optionalStringSchema,
  FIREBASE_CLIENT_EMAIL: optionalEmailSchema,
  FIREBASE_PRIVATE_KEY: optionalStringSchema,
  FIREBASE_STORAGE_BUCKET: optionalStringSchema,
  FIREBASE_USE_APPLICATION_DEFAULT: z.enum(["true", "false"]).default("false"),
  FIREBASE_AUTH_EMULATOR_HOST: optionalStringSchema,
  OBJECT_STORAGE_PUBLIC_URL: optionalUrlSchema,
  SSLCOMMERZ_STORE_ID: optionalStringSchema,
  SSLCOMMERZ_STORE_PASSWORD: optionalSecretSchema,
  SSLCOMMERZ_SANDBOX: z.enum(["true", "false"]).default("true"),
  PARCEL_QR_SIGNING_SECRET: optionalSigningSecretSchema,
  PARCEL_QR_TTL_SECONDS: z.coerce.number().int().min(60).max(31_536_000).default(7_776_000),
  API_SLOW_REQUEST_MS: z.coerce.number().int().min(1).max(300_000).default(1_000),
  HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(30_000),
  HTTP_HEADERS_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
  HTTP_KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(5_000),
  HTTP_MAX_REQUESTS_PER_SOCKET: z.coerce.number().int().min(1).max(100_000).default(1_000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info")
});

function validateFirebaseAdmin(env: z.infer<typeof apiEnvObject>, context: z.RefinementCtx) {
  const deployed = ["staging", "production"].includes(env.NODE_ENV);
  const serviceAccountComplete = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
  const applicationDefaultComplete = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_USE_APPLICATION_DEFAULT === "true");
  if (env.NODE_ENV === "production" && env.FIREBASE_AUTH_EMULATOR_HOST) context.addIssue({ code: z.ZodIssueCode.custom, path: ["FIREBASE_AUTH_EMULATOR_HOST"], message: "Firebase Auth emulator is forbidden in production" });
  if (deployed && !serviceAccountComplete && !applicationDefaultComplete) context.addIssue({ code: z.ZodIssueCode.custom, path: ["FIREBASE_PROJECT_ID"], message: "Firebase Admin credentials or application-default mode are required" });
  if (deployed && !env.FIREBASE_STORAGE_BUCKET) context.addIssue({ code: z.ZodIssueCode.custom, path: ["FIREBASE_STORAGE_BUCKET"], message: "Firebase Storage bucket is required" });
  if (Boolean(env.SSLCOMMERZ_STORE_ID) !== Boolean(env.SSLCOMMERZ_STORE_PASSWORD)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["SSLCOMMERZ_STORE_ID"], message: "SSLCommerz store ID and password must be configured together" });
  if (env.NODE_ENV === "production" && env.SSLCOMMERZ_STORE_ID && env.SSLCOMMERZ_SANDBOX === "true") context.addIssue({ code: z.ZodIssueCode.custom, path: ["SSLCOMMERZ_SANDBOX"], message: "SSLCommerz sandbox mode is forbidden in production" });
  if (deployed && !env.PARCEL_QR_SIGNING_SECRET) context.addIssue({ code: z.ZodIssueCode.custom, path: ["PARCEL_QR_SIGNING_SECRET"], message: "A document QR signing secret is required" });
  if (deployed && new URL(env.REDIS_URL).protocol !== "rediss:") context.addIssue({ code: z.ZodIssueCode.custom, path: ["REDIS_URL"], message: "TLS Redis (rediss://) is required outside local development" });
  for (const [key, value] of [["DATABASE_URL", env.DATABASE_URL], ["DIRECT_URL", env.DIRECT_URL]] as const) {
    if (!deployed || !value) continue;
    const url = new URL(value);
    const sslMode = url.searchParams.get("sslmode");
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !["require", "verify-ca", "verify-full"].includes(sslMode ?? "")) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must use PostgreSQL with TLS outside local development` });
    }
  }
  for (const [key, value] of [["API_PUBLIC_URL", env.API_PUBLIC_URL], ["APP_PUBLIC_URL", env.APP_PUBLIC_URL], ["OBJECT_STORAGE_PUBLIC_URL", env.OBJECT_STORAGE_PUBLIC_URL]] as const) {
    if (deployed && value && new URL(value).protocol !== "https:") context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must use HTTPS outside local development` });
  }
  if (deployed && !env.CORS_ORIGINS) context.addIssue({ code: z.ZodIssueCode.custom, path: ["CORS_ORIGINS"], message: "An explicit CORS origin allowlist is required outside local development" });
  if (deployed && env.CORS_ORIGINS) for (const origin of env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)) {
    let validOrigin = false;
    try {
      const url = new URL(origin);
      validOrigin = origin !== "*" && url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
    } catch {
      validOrigin = false;
    }
    if (!validOrigin) context.addIssue({ code: z.ZodIssueCode.custom, path: ["CORS_ORIGINS"], message: "Every deployed CORS origin must be an explicit HTTPS origin" });
  }
  if (env.HTTP_HEADERS_TIMEOUT_MS > env.HTTP_REQUEST_TIMEOUT_MS) context.addIssue({ code: z.ZodIssueCode.custom, path: ["HTTP_HEADERS_TIMEOUT_MS"], message: "HTTP headers timeout cannot exceed the request timeout" });
}

export const apiEnvSchema = apiEnvObject.superRefine(validateFirebaseAdmin);

const workerEnvObject = apiEnvObject.extend({
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().max(65_535).default(4_002),
  WORKER_SLOW_JOB_MS: z.coerce.number().int().min(1).max(3_600_000).default(5_000),
  AMIYO_DELIVERY_API_URL: optionalUrlSchema,
  AMIYO_DELIVERY_INTEGRATION_TOKEN: optionalSecretSchema,
  AMIYO_DELIVERY_WEBHOOK_SECRET: optionalSecretSchema,
  AMIYO_DELIVERY_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  EMAIL_PROVIDER: z.enum(["resend"]).optional(),
  EMAIL_PROVIDER_API_URL: optionalUrlSchema,
  EMAIL_PROVIDER_TOKEN: optionalSecretSchema,
  EMAIL_FROM: optionalStringSchema
});

export const workerEnvSchema = workerEnvObject.superRefine((env, context) => {
  validateFirebaseAdmin(env, context);
  if (Boolean(env.AMIYO_DELIVERY_API_URL) !== Boolean(env.AMIYO_DELIVERY_INTEGRATION_TOKEN)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["AMIYO_DELIVERY_API_URL"], message: "Delivery API URL and integration token must be configured together" });
  if (Boolean(env.EMAIL_PROVIDER) !== Boolean(env.EMAIL_PROVIDER_TOKEN) || Boolean(env.EMAIL_PROVIDER) !== Boolean(env.EMAIL_FROM)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["EMAIL_PROVIDER"], message: "Email provider, token, and sender must be configured together" });
});

export const mobilePublicEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_ANALYTICS_ENABLED: z.enum(["true", "false"]).default("false"),
  EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: optionalUrlSchema,
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
  EXPO_PUBLIC_EAS_PROJECT_ID: z.string().uuid().optional()
});

export function parseApiEnv(env: NodeJS.ProcessEnv) {
  return apiEnvSchema.parse(env);
}

export function parseWorkerEnv(env: NodeJS.ProcessEnv) {
  return workerEnvSchema.parse(env);
}

export function parseMobilePublicEnv(env: Record<string, string | undefined>) {
  return mobilePublicEnvSchema.parse(env);
}

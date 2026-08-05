import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "staging", "production"]).default("development");
const optionalUrlSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional());
const optionalSecretSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().min(12).optional());
const optionalStringSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().optional());
const optionalEmailSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional());

const apiEnvObject = z.object({
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.string().url(),
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
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info")
});

function validateFirebaseAdmin(env: z.infer<typeof apiEnvObject>, context: z.RefinementCtx) {
  const serviceAccountComplete = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
  const applicationDefaultComplete = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_USE_APPLICATION_DEFAULT === "true");
  if (env.NODE_ENV === "production" && env.FIREBASE_AUTH_EMULATOR_HOST) context.addIssue({ code: z.ZodIssueCode.custom, path: ["FIREBASE_AUTH_EMULATOR_HOST"], message: "Firebase Auth emulator is forbidden in production" });
  if (["staging", "production"].includes(env.NODE_ENV) && !serviceAccountComplete && !applicationDefaultComplete) context.addIssue({ code: z.ZodIssueCode.custom, path: ["FIREBASE_PROJECT_ID"], message: "Firebase Admin credentials or application-default mode are required" });
  if (["staging", "production"].includes(env.NODE_ENV) && !env.FIREBASE_STORAGE_BUCKET) context.addIssue({ code: z.ZodIssueCode.custom, path: ["FIREBASE_STORAGE_BUCKET"], message: "Firebase Storage bucket is required" });
}

export const apiEnvSchema = apiEnvObject.superRefine(validateFirebaseAdmin);

export const workerEnvSchema = apiEnvObject.extend({
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  AMIYO_DELIVERY_API_URL: optionalUrlSchema,
  AMIYO_DELIVERY_INTEGRATION_TOKEN: optionalSecretSchema,
  AMIYO_DELIVERY_WEBHOOK_SECRET: optionalSecretSchema,
  AMIYO_DELIVERY_TIMEOUT_MS: z.coerce.number().int().positive().default(12000)
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

import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "staging", "production"]).default("development");
const optionalUrlSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional());
const optionalSecretSchema = z.preprocess((value) => value === "" ? undefined : value, z.string().min(12).optional());

export const apiEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  OBJECT_STORAGE_PUBLIC_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info")
});

export const workerEnvSchema = apiEnvSchema.extend({
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  AMIYO_DELIVERY_API_URL: optionalUrlSchema,
  AMIYO_DELIVERY_INTEGRATION_TOKEN: optionalSecretSchema,
  AMIYO_DELIVERY_WEBHOOK_SECRET: optionalSecretSchema,
  AMIYO_DELIVERY_TIMEOUT_MS: z.coerce.number().int().positive().default(12000)
});

export const mobilePublicEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional()
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

import { Redis } from "ioredis";
import { rateLimit } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";

type RateLimitOptions = Parameters<typeof rateLimit>[0];

let redis: Redis | undefined;

function sharedStore(prefix: string) {
  if (!['staging', 'production'].includes(process.env.NODE_ENV ?? '')) return undefined;
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required for shared production rate limits");
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, { enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    redis.on("error", () => undefined);
  }
  return new RedisStore({ prefix: `amiyo:rate-limit:${prefix}:`, sendCommand: (command, ...args) => redis!.call(command, ...args) as Promise<RedisReply> });
}

export function marketplaceRateLimit(prefix: string, options: RateLimitOptions) {
  const store = sharedStore(prefix);
  return rateLimit({ ...options, ...(store ? { store, passOnStoreError: false } : {}) });
}

import type { Request } from "express";
import { rateLimit } from "express-rate-limit";

export function authenticatedWriteLimit(options: { code: string; limit: number; windowMs?: number }) {
  return rateLimit({
    windowMs: options.windowMs ?? 60_000,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
    keyGenerator: (req: Request) => req.auth?.principal.userId ?? "authentication-pending",
    message: { type: "https://amiyo.app/problems/rate-limit", title: "Too many write requests", status: 429, code: options.code }
  });
}

import type { NextFunction, Request, Response } from "express";
import { correlationHeader } from "@amiyo/observability";

type RequestLogger = {
  info(values: Record<string, unknown>, message: string): void;
  warn(values: Record<string, unknown>, message: string): void;
};

function threshold(value: string | undefined) {
  const parsed = Number(value ?? 1_000);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1_000;
}

export function requestObservabilityMiddleware(options: { slowRequestMs?: number; now?: () => number } = {}) {
  const slowRequestMs = options.slowRequestMs ?? threshold(process.env.API_SLOW_REQUEST_MS);
  const now = options.now ?? (() => performance.now());
  return (req: Request, res: Response, next: NextFunction) => {
    const startedAt = now();
    let recorded = false;
    const record = (completed: boolean) => {
      if (recorded) return;
      recorded = true;
      const durationMs = Math.max(0, Math.round((now() - startedAt) * 100) / 100);
      const values = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        completed,
        correlationId: String(req.headers[correlationHeader] || "")
      };
      const logger = req.app.locals.logger as RequestLogger;
      if (!completed) logger.warn(values, "API request aborted");
      else if (durationMs >= slowRequestMs) logger.warn(values, "Slow API request");
      else logger.info(values, "API request completed");
    };
    res.once("finish", () => record(true));
    res.once("close", () => record(res.writableEnded));
    next();
  };
}

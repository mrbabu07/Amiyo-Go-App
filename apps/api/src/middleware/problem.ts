import type { NextFunction, Request, Response } from "express";
import { correlationHeader } from "@amiyo/observability";

export function problemMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const correlationId = String(req.headers[correlationHeader] || "");
  req.app.locals.logger.error({ error, correlationId }, "Unhandled API error");
  res.status(500).json({
    type: "https://api.amiyo-go.local/problems/internal-error",
    title: "Internal server error",
    status: 500,
    code: "INTERNAL_ERROR",
    correlationId
  });
}

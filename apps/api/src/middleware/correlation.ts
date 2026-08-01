import type { NextFunction, Request, Response } from "express";
import { createCorrelationId, correlationHeader } from "@amiyo/observability";

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = createCorrelationId(req.headers[correlationHeader]);
  res.setHeader(correlationHeader, correlationId);
  req.headers[correlationHeader] = correlationId;
  next();
}

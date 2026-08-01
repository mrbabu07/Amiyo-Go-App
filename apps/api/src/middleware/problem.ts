import type { NextFunction, Request, Response } from "express";
import { correlationHeader } from "@amiyo/observability";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiProblem } from "./api-problem.js";

export function problemMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const correlationId = String(req.headers[correlationHeader] || "");
  if (error instanceof ApiProblem) {
    res.status(error.status).type("application/problem+json").json({
      type: `https://api.amiyo-go.local/problems/${error.code.toLowerCase().replaceAll("_", "-")}`,
      title: error.message,
      status: error.status,
      code: error.code,
      ...(correlationId ? { correlationId } : {})
    });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).type("application/problem+json").json({
      type: "https://api.amiyo-go.local/problems/validation-error",
      title: "Request validation failed",
      status: 400,
      code: "VALIDATION_ERROR",
      detail: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      ...(correlationId ? { correlationId } : {})
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).type("application/problem+json").json({
      type: "https://api.amiyo-go.local/problems/resource-conflict",
      title: "This identity or resource is already registered",
      status: 409,
      code: "RESOURCE_CONFLICT",
      ...(correlationId ? { correlationId } : {})
    });
    return;
  }
  req.app.locals.logger.error({ error, correlationId }, "Unhandled API error");
  res.status(500).json({
    type: "https://api.amiyo-go.local/problems/internal-error",
    title: "Internal server error",
    status: 500,
    code: "INTERNAL_ERROR",
    correlationId
  });
}

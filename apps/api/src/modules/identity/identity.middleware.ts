import type { NextFunction, Request, Response } from "express";
import { ApiProblem } from "../../middleware/api-problem.js";
import type { IdentityService } from "./identity.service.js";
import type { IdentityTokenVerifier } from "./identity.types.js";

export function readBearerToken(authorization: string | undefined) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new ApiProblem(401, "AUTHENTICATION_REQUIRED", "A bearer access token is required");
  return match[1];
}

export function createAuthenticationMiddleware(verifier: IdentityTokenVerifier, service: IdentityService) {
  return async function authenticate(req: Request, _res: Response, next: NextFunction) {
    try {
      const identity = await verifier.verify(readBearerToken(req.header("authorization")));
      const session = await service.synchronizeSession(identity, req.header("x-correlation-id"));
      if (session.status !== "ACTIVE") {
        throw new ApiProblem(403, "ACCOUNT_NOT_ACTIVE", "This account is not active");
      }
      req.verifiedIdentity = identity;
      req.auth = session;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireSession(req: Request) {
  if (!req.auth) throw new ApiProblem(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  return req.auth;
}

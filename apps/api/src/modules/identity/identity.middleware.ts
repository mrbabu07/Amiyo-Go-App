import type { NextFunction, Request, Response } from "express";
import { ApiProblem } from "../../middleware/api-problem.js";
import type { IdentityService } from "./identity.service.js";
import type { IdentityTokenVerifier } from "./identity.types.js";

const authenticatedRequests = new WeakMap<Request, { token: string; session: NonNullable<Request["auth"]>; identity: NonNullable<Request["verifiedIdentity"]> }>();

export function readBearerToken(authorization: string | undefined) {
  const value = authorization?.trim();
  const separator = value?.indexOf(" ") ?? -1;
  const token = separator > 0 ? value!.slice(separator + 1).trim() : "";
  const invalidToken = !token || token.length > 16_384 || Array.from(token).some((character) => character.charCodeAt(0) <= 32);
  if (value?.slice(0, separator).toLowerCase() !== "bearer" || invalidToken) throw new ApiProblem(401, "AUTHENTICATION_REQUIRED", "A bearer access token is required");
  return token;
}

export function createAuthenticationMiddleware(verifier: IdentityTokenVerifier, service: IdentityService) {
  return async function authenticate(req: Request, _res: Response, next: NextFunction) {
    try {
      const token = readBearerToken(req.header("authorization"));
      const previous = authenticatedRequests.get(req);
      if (previous?.token === token && previous.session.status === "ACTIVE") {
        req.verifiedIdentity = previous.identity;
        req.auth = previous.session;
        next();
        return;
      }
      authenticatedRequests.delete(req);
      const identity = await verifier.verify(token);
      const session = await service.synchronizeSession(identity, req.header("x-correlation-id"));
      if (session.status !== "ACTIVE") {
        throw new ApiProblem(403, "ACCOUNT_NOT_ACTIVE", "This account is not active");
      }
      req.verifiedIdentity = identity;
      req.auth = session;
      authenticatedRequests.set(req, { token, session, identity });
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

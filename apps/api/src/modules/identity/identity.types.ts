import type { Session } from "@amiyo/contracts";

export interface VerifiedIdentity {
  subject: string;
  email?: string;
  phone?: string;
  displayName?: string;
}

export interface IdentityTokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
}

declare global {
  namespace Express {
    interface Request {
      auth?: Session;
      verifiedIdentity?: VerifiedIdentity;
    }
  }
}

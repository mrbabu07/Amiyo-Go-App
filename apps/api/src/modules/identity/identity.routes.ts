import { Router } from "express";
import { principalSchema } from "@amiyo/contracts";
import { getRolePermissions, hasPermission, type Permission, type Role } from "@amiyo/domain";

export function createIdentityRouter() {
  const router = Router();

  router.get("/api/v1/identity/session", (_req, res) => {
    const demoPrincipal = principalSchema.parse({
      userId: "00000000-0000-4000-8000-000000000001",
      roles: ["CUSTOMER"],
      vendorIds: []
    });

    res.json({
      principal: demoPrincipal,
      permissions: getRolePermissions("CUSTOMER")
    });
  });

  router.post("/api/v1/identity/authorize", (req, res) => {
    const roles = (Array.isArray(req.body?.roles) ? req.body.roles : []) as Role[];
    const permission = String(req.body?.permission || "") as Permission;
    res.json({ allowed: hasPermission(roles, permission) });
  });

  return router;
}

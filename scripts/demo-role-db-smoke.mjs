import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const expected = new Map([
  ["amiyo-demo-customer", "CUSTOMER"],
  ["amiyo-demo-vendor", "VENDOR_OWNER"],
  ["amiyo-demo-admin", "SUPER_ADMIN"]
]);

try {
  const users = await prisma.user.findMany({
    where: { providerSubject: { in: [...expected.keys()] } },
    select: { providerSubject: true, roles: { select: { role: { select: { name: true } } } }, vendorMemberships: { select: { role: true, status: true } } }
  });
  assert.equal(users.length, expected.size, "All demo role identities must exist in the database");
  for (const user of users) {
    assert.ok(user.roles.some(({ role }) => role.name === expected.get(user.providerSubject)), `${user.providerSubject} is missing ${expected.get(user.providerSubject)}`);
  }
  const vendor = users.find((user) => user.providerSubject === "amiyo-demo-vendor");
  assert.ok(vendor?.vendorMemberships.some((membership) => membership.role === "VENDOR_OWNER" && membership.status === "active"), "Demo vendor membership is missing");
  console.log(JSON.stringify({ service: "demo-role-database", accounts: users.length, status: "ok" }));
} finally {
  await prisma.$disconnect();
}

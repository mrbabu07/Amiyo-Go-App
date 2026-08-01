import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

const permissionKeys = [
  "catalog.read", "cart.manage", "orders.read-own", "orders.manage-vendor", "products.manage-vendor", "inventory.manage-vendor", "finance.read-vendor", "support.manage", "payments.manage", "payouts.manage", "platform.manage"
];

const rolePermissions: Record<RoleName, string[]> = {
  CUSTOMER: ["catalog.read", "cart.manage", "orders.read-own"],
  VENDOR_OWNER: ["catalog.read", "orders.manage-vendor", "products.manage-vendor", "inventory.manage-vendor", "finance.read-vendor"],
  VENDOR_MANAGER: ["catalog.read", "orders.manage-vendor", "products.manage-vendor", "inventory.manage-vendor"],
  VENDOR_STAFF: ["catalog.read", "orders.manage-vendor", "inventory.manage-vendor"],
  SUPPORT_AGENT: ["catalog.read", "support.manage"],
  FINANCE_ADMIN: ["catalog.read", "payments.manage", "payouts.manage"],
  OPERATIONS_ADMIN: ["catalog.read", "support.manage", "orders.manage-vendor"],
  SUPER_ADMIN: permissionKeys
};

const ids = {
  user: "00000000-0000-4000-8000-000000000001",
  vendor: "00000000-0000-4000-8000-000000000101",
  shop: "00000000-0000-4000-8000-000000000201",
  categoryFashion: "00000000-0000-4000-8000-000000000301",
  categoryElectronics: "00000000-0000-4000-8000-000000000302",
  product: "00000000-0000-4000-8000-000000000401",
  variant: "00000000-0000-4000-8000-000000000501",
  inventory: "00000000-0000-4000-8000-000000000601"
};

async function seedAccessControl() {
  const permissions = new Map<string, string>();
  for (const key of permissionKeys) {
    const permission = await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
    permissions.set(key, permission.id);
  }

  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
    await prisma.rolePermission.createMany({
      data: rolePermissions[roleName].map((key) => ({ roleId: role.id, permissionId: permissions.get(key)! })),
      skipDuplicates: true
    });
  }
}

async function seedDemoCatalog() {
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.CUSTOMER } });
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.VENDOR_OWNER } });
  await prisma.user.upsert({
    where: { id: ids.user },
    update: {},
    create: {
      id: ids.user,
      providerSubject: "seed:vendor-owner",
      normalizedEmail: "owner@example.test",
      profile: { create: { displayName: "Amiyo Demo Seller", firstName: "Amiyo", lastName: "Seller" } },
      roles: { create: [{ roleId: customerRole.id }, { roleId: ownerRole.id }] }
    }
  });

  await prisma.vendor.upsert({
    where: { id: ids.vendor },
    update: {},
    create: {
      id: ids.vendor,
      legalName: "Amiyo Demo Commerce Ltd",
      displayName: "Tech Gallery",
      status: "APPROVED",
      members: { create: { userId: ids.user, role: RoleName.VENDOR_OWNER } },
      wallet: { create: {} }
    }
  });

  await prisma.vendorShop.upsert({
    where: { id: ids.shop },
    update: {},
    create: { id: ids.shop, vendorId: ids.vendor, name: "Tech Gallery", slug: "tech-gallery", status: "ACTIVE", description: "Verified electronics and lifestyle shop." }
  });

  await prisma.category.upsert({ where: { id: ids.categoryFashion }, update: {}, create: { id: ids.categoryFashion, name: "Fashion", slug: "fashion", displayOrder: 10 } });
  await prisma.category.upsert({ where: { id: ids.categoryElectronics }, update: {}, create: { id: ids.categoryElectronics, name: "Electronics", slug: "electronics", displayOrder: 20 } });

  await prisma.product.upsert({
    where: { id: ids.product },
    update: {},
    create: {
      id: ids.product,
      vendorId: ids.vendor,
      shopId: ids.shop,
      categoryId: ids.categoryElectronics,
      name: "Premium Wireless Headphones",
      slug: "premium-wireless-headphones",
      description: "Comfortable wireless headphones with clear sound and long battery life.",
      brand: "Amiyo Select",
      status: "APPROVED",
      publishedAt: new Date(),
      variants: {
        create: {
          id: ids.variant,
          sku: "AMIYO-WH-001-BLK",
          title: "Black",
          attributes: { color: "Black" },
          priceMinor: 249000n,
          compareAtMinor: 349000n,
          inventory: { create: { id: ids.inventory, onHand: 100, reserved: 0, reorderLevel: 10 } }
        }
      },
      media: { create: { storageKey: "seed/products/wireless-headphones/main.webp", mediaType: "image", mimeType: "image/webp", altText: "Black wireless headphones" } }
    }
  });
}

async function main() {
  await seedAccessControl();
  await seedDemoCatalog();
}

main().finally(async () => prisma.$disconnect());

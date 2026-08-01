import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

const permissionKeys = [
  "catalog:read", "cart:manage", "checkout:manage", "orders:read", "orders:manage", "returns:manage", "reviews:manage", "support:manage", "vendor:read", "vendor:manage", "products:manage", "inventory:manage", "finance:read", "finance:manage", "kyc:manage", "admin:read", "admin:manage", "audit:read", "settings:manage"
];

const rolePermissions: Record<RoleName, string[]> = {
  CUSTOMER: ["catalog:read", "cart:manage", "checkout:manage", "orders:read", "returns:manage", "reviews:manage", "support:manage"],
  VENDOR_OWNER: ["vendor:read", "vendor:manage", "products:manage", "inventory:manage", "orders:read", "orders:manage", "finance:read", "finance:manage", "kyc:manage", "support:manage"],
  VENDOR_MANAGER: ["vendor:read", "vendor:manage", "products:manage", "inventory:manage", "orders:read", "orders:manage", "finance:read", "support:manage"],
  VENDOR_STAFF: ["vendor:read", "orders:read", "orders:manage", "products:manage", "support:manage"],
  SUPPORT_AGENT: ["orders:read", "support:manage", "admin:read"],
  FINANCE_ADMIN: ["orders:read", "finance:read", "finance:manage", "audit:read", "admin:read"],
  OPERATIONS_ADMIN: ["catalog:read", "products:manage", "inventory:manage", "orders:read", "orders:manage", "returns:manage", "admin:read", "admin:manage"],
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
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: rolePermissions[roleName].map((key) => ({ roleId: role.id, permissionId: permissions.get(key)! })),
      skipDuplicates: true
    });
  }
  await prisma.permission.deleteMany({ where: { key: { notIn: permissionKeys } } });
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
  const extraCategories = [
    ["00000000-0000-4000-8000-000000000303", "Beauty", "beauty", 30],
    ["00000000-0000-4000-8000-000000000304", "Home & Living", "home-living", 40],
    ["00000000-0000-4000-8000-000000000305", "Grocery", "grocery", 50]
  ] as const;
  for (const [id, name, slug, displayOrder] of extraCategories) {
    await prisma.category.upsert({ where: { id }, update: { name, slug, displayOrder }, create: { id, name, slug, displayOrder } });
  }

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
  await prisma.productMedia.updateMany({ where: { productId: ids.product }, data: { storageKey: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&h=900&fit=crop" } });

  const demoProducts = [
    ["410", "510", "610", ids.categoryElectronics, "Active Smart Watch", "active-smart-watch", "AMIYO-WATCH-001", 189000n, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&h=900&fit=crop"],
    ["411", "511", "611", ids.categoryFashion, "Everyday Comfort Sneakers", "everyday-comfort-sneakers", "AMIYO-SHOE-001", 159000n, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&h=900&fit=crop"],
    ["412", "512", "612", ids.categoryFashion, "Water Resistant Travel Backpack", "travel-backpack", "AMIYO-BAG-001", 129000n, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&h=900&fit=crop"],
    ["413", "513", "613", extraCategories[0][0], "Hydrating Daily Skincare Set", "hydrating-skincare-set", "AMIYO-SKIN-001", 99000n, "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=900&h=900&fit=crop"],
    ["414", "514", "614", extraCategories[1][0], "Modern Lounge Chair", "modern-lounge-chair", "AMIYO-CHAIR-001", 649000n, "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&h=900&fit=crop"],
    ["415", "515", "615", extraCategories[0][0], "Signature Eau de Parfum", "signature-eau-de-parfum", "AMIYO-PERFUME-001", 229000n, "https://images.unsplash.com/photo-1541643600914-78b084683601?w=900&h=900&fit=crop"],
    ["416", "516", "616", extraCategories[1][0], "Indoor Plant with Ceramic Pot", "indoor-plant-ceramic-pot", "AMIYO-PLANT-001", 69000n, "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=900&h=900&fit=crop"],
    ["417", "517", "617", extraCategories[2][0], "Premium Roasted Coffee Beans", "premium-roasted-coffee", "AMIYO-COFFEE-001", 78000n, "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=900&h=900&fit=crop"]
  ] as const;
  for (const [productSuffix, variantSuffix, inventorySuffix, categoryId, name, slug, sku, priceMinor, image] of demoProducts) {
    const productId = `00000000-0000-4000-8000-000000000${productSuffix}`;
    await prisma.product.upsert({
      where: { id: productId },
      update: { name, slug, categoryId, status: "APPROVED", publishedAt: new Date() },
      create: {
        id: productId, vendorId: ids.vendor, shopId: ids.shop, categoryId, name, slug, description: `${name} from a verified Amiyo-Go seller.`, brand: "Amiyo Select", status: "APPROVED", publishedAt: new Date(),
        variants: { create: { id: `00000000-0000-4000-8000-000000000${variantSuffix}`, sku, title: "Default", priceMinor, compareAtMinor: priceMinor + 50000n, inventory: { create: { id: `00000000-0000-4000-8000-000000000${inventorySuffix}`, onHand: 50, reorderLevel: 5 } } } },
        media: { create: { storageKey: image, mediaType: "image", mimeType: "image/jpeg", altText: name } }
      }
    });
  }
}

async function main() {
  await seedAccessControl();
  await seedDemoCatalog();
}

main().finally(async () => prisma.$disconnect());

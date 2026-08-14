import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { PrismaClient, RoleName } from "@prisma/client";
import { categoryTaxonomy } from "./category-taxonomy.js";

if (!process.env.DATABASE_URL && existsSync("apps/api/.env")) loadEnvFile("apps/api/.env");

const prisma = new PrismaClient();

const taxonomyCategoryId = (index: number) => `00000000-0000-4000-9000-${String(index + 1).padStart(12, "0")}`;

type SeedCategoryAttribute = { key: string; label: string; dataType: "text" | "number" | "boolean" | "select" | "multiselect"; required?: boolean; filterable?: boolean; options?: string[] };
const commonProductAttributes: SeedCategoryAttribute[] = [
  { key: "condition", label: "Condition", dataType: "select", required: true, filterable: true, options: ["New", "Like New", "Used"] },
  { key: "country_of_origin", label: "Country of origin", dataType: "text", filterable: true }
];
function categoryAttributes(rootSlug: string, categorySlug: string): SeedCategoryAttribute[] {
  const searchable = `${rootSlug} ${categorySlug}`;
  const fields: SeedCategoryAttribute[] = [...commonProductAttributes];
  if (/fashion|cloth|shoe|jewelry|watch|luggage/.test(searchable)) fields.push({ key: "material", label: "Material", dataType: "text", required: true, filterable: true }, { key: "style", label: "Style", dataType: "select", filterable: true, options: ["Casual", "Formal", "Traditional", "Sports", "Everyday"] });
  if (/shoe|footwear/.test(searchable)) fields.push({ key: "size_system", label: "Size system", dataType: "select", required: true, options: ["EU", "UK", "US", "BD"] });
  if (/electronic|mobile|gadget|computer|audio|camera|appliance/.test(searchable)) fields.push({ key: "model", label: "Model", dataType: "text", required: true, filterable: true }, { key: "warranty_months", label: "Warranty (months)", dataType: "number", filterable: true }, { key: "connectivity", label: "Connectivity", dataType: "multiselect", filterable: true, options: ["Wi-Fi", "Bluetooth", "USB", "4G", "5G"] });
  if (/phone|tablet|computer|gadget/.test(searchable)) fields.push({ key: "storage_capacity", label: "Storage capacity", dataType: "select", filterable: true, options: ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"] });
  if (/food|grocery|fresh|fish|seafood|vegetable|restaurant|pharmacy/.test(searchable)) fields.push({ key: "net_weight", label: "Net weight / quantity", dataType: "text", required: true, filterable: true }, { key: "expiry_information", label: "Expiry information", dataType: "text" }, { key: "organic", label: "Organic", dataType: "boolean", filterable: true });
  if (/beauty|health|pharmacy|grooming/.test(searchable)) fields.push({ key: "form", label: "Product form", dataType: "select", filterable: true, options: ["Liquid", "Cream", "Gel", "Powder", "Tablet", "Other"] }, { key: "suitable_for", label: "Suitable for", dataType: "multiselect", filterable: true, options: ["Men", "Women", "Kids", "All"] });
  if (/home|furniture|kitchen|decor|hardware|garden/.test(searchable)) fields.push({ key: "material", label: "Material", dataType: "text", filterable: true }, { key: "dimensions", label: "Dimensions", dataType: "text" }, { key: "assembly_required", label: "Assembly required", dataType: "boolean" });
  if (/baby|kids|toy/.test(searchable)) fields.push({ key: "age_range", label: "Age range", dataType: "select", required: true, filterable: true, options: ["0-6 months", "6-12 months", "1-3 years", "3-5 years", "5-8 years", "8+ years"] });
  const unique = new Map(fields.map((field) => [field.key, field]));
  return [...unique.values()];
}

const permissionKeys = [
  "catalog:read", "cart:manage", "checkout:manage", "orders:read", "orders:manage", "returns:manage", "reviews:manage", "support:manage", "vendor:read", "vendor:manage", "products:manage", "inventory:manage", "finance:read", "finance:manage", "kyc:manage", "admin:read", "admin:manage", "audit:read", "settings:manage"
];

const rolePermissions: Record<RoleName, string[]> = {
  CUSTOMER: ["catalog:read", "cart:manage", "checkout:manage", "orders:read", "returns:manage", "reviews:manage", "support:manage"],
  VENDOR_OWNER: ["vendor:read", "vendor:manage", "products:manage", "inventory:manage", "orders:read", "orders:manage", "returns:manage", "finance:read", "finance:manage", "kyc:manage", "support:manage"],
  VENDOR_MANAGER: ["vendor:read", "vendor:manage", "products:manage", "inventory:manage", "orders:read", "orders:manage", "returns:manage", "finance:read", "support:manage"],
  VENDOR_STAFF: ["vendor:read", "orders:read", "orders:manage", "returns:manage", "products:manage", "support:manage"],
  SUPPORT_AGENT: ["orders:read", "support:manage", "admin:read"],
  FINANCE_ADMIN: ["orders:read", "finance:read", "finance:manage", "audit:read", "admin:read"],
  OPERATIONS_ADMIN: ["catalog:read", "products:manage", "inventory:manage", "orders:read", "orders:manage", "returns:manage", "admin:read", "admin:manage"],
  SUPER_ADMIN: permissionKeys
};

const ids = {
  user: "00000000-0000-4000-8000-000000000001",
  customerUser: "00000000-0000-4000-8000-000000000002",
  adminUser: "00000000-0000-4000-8000-000000000003",
  vendor: "00000000-0000-4000-8000-000000000101",
  shop: "00000000-0000-4000-8000-000000000201",
  categoryFashion: "00000000-0000-4000-8000-000000000301",
  categoryElectronics: "00000000-0000-4000-8000-000000000302",
  product: "00000000-0000-4000-8000-000000000401",
  variant: "00000000-0000-4000-8000-000000000501",
  inventory: "00000000-0000-4000-8000-000000000601"
  , customerAddress: "00000000-0000-4000-8000-000000000701"
  , customerOrder: "00000000-0000-4000-8000-000000000801"
  , customerVendorOrder: "00000000-0000-4000-8000-000000000901"
  , customerOrderItem: "00000000-0000-4000-8000-000000001001"
  , customerShipment: "00000000-0000-4000-8000-000000001101"
  , logisticsZone: "00000000-0000-4000-8000-000000001301"
  , courierPartner: "00000000-0000-4000-8000-000000001302"
  , pickupStaff: "00000000-0000-4000-8000-000000001303"
  , feeRule: "00000000-0000-4000-8000-000000001304"
  , logisticsAssignment: "00000000-0000-4000-8000-000000001305"
  , codRemittance: "00000000-0000-4000-8000-000000001306"
  , returnOrder: "00000000-0000-4000-8000-000000001801"
  , returnVendorOrder: "00000000-0000-4000-8000-000000001901"
  , returnOrderItem: "00000000-0000-4000-8000-000000002001"
  , returnCase: "00000000-0000-4000-8000-000000002101"
  , returnItem: "00000000-0000-4000-8000-000000002201"
  , returnEvent: "00000000-0000-4000-8000-000000002301"
  , returnPayment: "00000000-0000-4000-8000-000000002401"
  , vendorBankAccount: "00000000-0000-4000-8000-000000002501"
  , payoutRequest: "00000000-0000-4000-8000-000000002601"
  , customerTicket: "00000000-0000-4000-8000-000000002701"
  , customerReview: "00000000-0000-4000-8000-000000002801"
  , manualPayment: "00000000-0000-4000-8000-000000002901"
  , paymentVerification: "00000000-0000-4000-8000-000000003001"
  , marketplaceVoucher: "00000000-0000-4000-8000-000000003101"
  , flashSale: "00000000-0000-4000-8000-000000003201"
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
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SUPER_ADMIN } });
  const demoUsers = [
    { id: ids.customerUser, subject: "amiyo-demo-customer", email: "customer@amiyo.test", displayName: "Demo Customer", roleIds: [customerRole.id] },
    { id: ids.user, subject: "amiyo-demo-vendor", email: "vendor@amiyo.test", displayName: "Demo Vendor", roleIds: [customerRole.id, ownerRole.id] },
    { id: ids.adminUser, subject: "amiyo-demo-admin", email: "admin@amiyo.test", displayName: "Demo Admin", roleIds: [customerRole.id, adminRole.id] }
  ];
  for (const demoUser of demoUsers) {
    await prisma.user.upsert({
      where: { id: demoUser.id },
      update: { providerSubject: demoUser.subject, normalizedEmail: demoUser.email, profile: { upsert: { create: { displayName: demoUser.displayName }, update: { displayName: demoUser.displayName } } } },
      create: { id: demoUser.id, providerSubject: demoUser.subject, normalizedEmail: demoUser.email, profile: { create: { displayName: demoUser.displayName } } }
    });
    await prisma.userRole.createMany({ data: demoUser.roleIds.map((roleId) => ({ userId: demoUser.id, roleId })), skipDuplicates: true });
  }

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

  const fashionVendorId = "00000000-0000-4000-8000-000000000102";
  const fashionShopId = "00000000-0000-4000-8000-000000000202";
  const pendingVendorId = "00000000-0000-4000-8000-000000000103";
  await prisma.vendor.upsert({ where: { id: fashionVendorId }, update: { status: "APPROVED" }, create: { id: fashionVendorId, legalName: "Dhaka Fashion House Ltd", displayName: "Dhaka Fashion House", status: "APPROVED", approvedAt: new Date(), wallet: { create: {} } } });
  await prisma.vendorShop.upsert({ where: { id: fashionShopId }, update: { status: "ACTIVE" }, create: { id: fashionShopId, vendorId: fashionVendorId, name: "Dhaka Fashion House", slug: "dhaka-fashion-house", status: "ACTIVE", description: "Contemporary Bangladeshi fashion, shoes and accessories." } });
  await prisma.vendor.upsert({ where: { id: pendingVendorId }, update: { status: "PENDING" }, create: { id: pendingVendorId, legalName: "Fresh Basket Bangladesh", displayName: "Fresh Basket BD", status: "PENDING", wallet: { create: {} } } });
  const pendingKyc = await prisma.vendorKycSubmission.findFirst({ where: { vendorId: pendingVendorId, status: "SUBMITTED" } });
  if (!pendingKyc) await prisma.vendorKycSubmission.create({ data: { vendorId: pendingVendorId, status: "SUBMITTED", submittedAt: new Date(), documents: { create: { documentType: "TRADE_LICENSE", storageKey: "seed/kyc/fresh-basket-trade-license.pdf", mimeType: "application/pdf", checksum: "seed-fresh-basket-trade-license" } } } });

  const categoryIds = new Map<string, string>();
  let taxonomyIndex = 0;
  for (const [rootIndex, root] of categoryTaxonomy.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: root.slug },
      update: { parentId: null, name: root.name, description: `Shop ${root.name}`, status: "active", displayOrder: (rootIndex + 1) * 10 },
      create: { id: taxonomyCategoryId(taxonomyIndex), name: root.name, slug: root.slug, description: `Shop ${root.name}`, displayOrder: (rootIndex + 1) * 10 }
    });
    taxonomyIndex += 1;
    categoryIds.set(root.slug, category.id);
  }
  for (const root of categoryTaxonomy) {
    const parentId = categoryIds.get(root.slug)!;
    for (const [childIndex, child] of root.children.entries()) {
      const category = await prisma.category.upsert({
        where: { slug: child.slug },
        update: { parentId, name: child.name, description: `Browse ${child.name}`, status: "active", displayOrder: (childIndex + 1) * 10 },
        create: { id: taxonomyCategoryId(taxonomyIndex), parentId, name: child.name, slug: child.slug, description: `Browse ${child.name}`, displayOrder: (childIndex + 1) * 10 }
      });
      taxonomyIndex += 1;
      categoryIds.set(child.slug, category.id);
    }
  }
  const existingAttributeCategories = new Set((await prisma.categoryAttribute.findMany({ distinct: ["categoryId"], select: { categoryId: true } })).map((item) => item.categoryId));
  const attributeRows: Array<{ id: string; categoryId: string; key: string; label: string; dataType: string; required: boolean; filterable: boolean; displayOrder: number }> = [];
  const optionRows: Array<{ attributeId: string; value: string; label: string; displayOrder: number }> = [];
  for (const root of categoryTaxonomy) {
    for (const slug of [root.slug, ...root.children.map((child) => child.slug)]) {
      const categoryId = categoryIds.get(slug)!;
      if (existingAttributeCategories.has(categoryId)) continue;
      const definitions = categoryAttributes(root.slug, slug);
      for (const [displayOrder, attribute] of definitions.entries()) {
        const id = randomUUID();
        attributeRows.push({ id, categoryId, key: attribute.key, label: attribute.label, dataType: attribute.dataType, required: attribute.required ?? false, filterable: attribute.filterable ?? false, displayOrder });
        optionRows.push(...(attribute.options ?? []).map((label, displayOrder) => ({ attributeId: id, label, value: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), displayOrder })));
      }
    }
  }
  if (attributeRows.length) await prisma.$transaction([prisma.categoryAttribute.createMany({ data: attributeRows, skipDuplicates: true }), prisma.categoryAttributeOption.createMany({ data: optionRows, skipDuplicates: true })]);
  const beautyId = categoryIds.get("beauty")!;
  const foodCupboardId = categoryIds.get("food-cupboard")!;
  await prisma.category.updateMany({ where: { slug: { in: ["skincare", "makeup", "fragrance"] } }, data: { parentId: beautyId, status: "active" } });
  await prisma.category.updateMany({ where: { slug: { in: ["snacks", "cooking-essentials"] } }, data: { parentId: foodCupboardId, status: "active" } });
  await prisma.category.updateMany({ where: { slug: { in: ["fashion", "home-living", "grocery", "shoes-bags", "mobiles-tablets", "computers-accessories", "kitchen-dining"] } }, data: { status: "inactive" } });

  await prisma.product.upsert({
    where: { id: ids.product },
    update: {},
    create: {
      id: ids.product,
      vendorId: ids.vendor,
      shopId: ids.shop,
      categoryId: categoryIds.get("audio")!,
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
    ["410", "510", "610", categoryIds.get("mobile-gadgets")!, "Active Smart Watch", "active-smart-watch", "AMIYO-WATCH-001", 189000n, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&h=900&fit=crop"],
    ["411", "511", "611", categoryIds.get("mens-shoes")!, "Everyday Comfort Sneakers", "everyday-comfort-sneakers", "AMIYO-SHOE-001", 159000n, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&h=900&fit=crop"],
    ["412", "512", "612", categoryIds.get("travel-bags")!, "Water Resistant Travel Backpack", "travel-backpack", "AMIYO-BAG-001", 129000n, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&h=900&fit=crop"],
    ["413", "513", "613", beautyId, "Hydrating Daily Skincare Set", "hydrating-skincare-set", "AMIYO-SKIN-001", 99000n, "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=900&h=900&fit=crop"],
    ["414", "514", "614", categoryIds.get("furniture")!, "Modern Lounge Chair", "modern-lounge-chair", "AMIYO-CHAIR-001", 649000n, "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&h=900&fit=crop"],
    ["415", "515", "615", beautyId, "Signature Eau de Parfum", "signature-eau-de-parfum", "AMIYO-PERFUME-001", 229000n, "https://images.unsplash.com/photo-1541643600914-78b084683601?w=900&h=900&fit=crop"],
    ["416", "516", "616", categoryIds.get("home-decor")!, "Indoor Plant with Ceramic Pot", "indoor-plant-ceramic-pot", "AMIYO-PLANT-001", 69000n, "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=900&h=900&fit=crop"],
    ["417", "517", "617", categoryIds.get("beverages")!, "Premium Roasted Coffee Beans", "premium-roasted-coffee", "AMIYO-COFFEE-001", 78000n, "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=900&h=900&fit=crop"]
    , ["418", "518", "618", categoryIds.get("mobiles")!, "5G Android Smartphone", "5g-android-smartphone", "AMIYO-PHONE-001", 2899000n, "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&h=900&fit=crop"]
    , ["419", "519", "619", categoryIds.get("computers")!, "Slim Business Laptop", "slim-business-laptop", "AMIYO-LAPTOP-001", 7299000n, "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&h=900&fit=crop"]
    , ["420", "520", "620", categoryIds.get("cameras-gadgets")!, "Compact Mirrorless Camera", "compact-mirrorless-camera", "AMIYO-CAMERA-001", 5599000n, "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=900&h=900&fit=crop"]
    , ["421", "521", "621", categoryIds.get("mens-clothing")!, "Premium Cotton Panjabi", "premium-cotton-panjabi", "AMIYO-PANJABI-001", 219000n, "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=900&h=900&fit=crop"]
    , ["422", "522", "622", categoryIds.get("womens-traditional-wear")!, "Handloom Jamdani Saree", "handloom-jamdani-saree", "AMIYO-SAREE-001", 489000n, "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&h=900&fit=crop"]
    , ["423", "523", "623", categoryIds.get("womens-accessories")!, "Classic Leather Handbag", "classic-leather-handbag", "AMIYO-HANDBAG-001", 279000n, "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&h=900&fit=crop"]
    , ["424", "524", "624", categoryIds.get("kitchen")!, "Nonstick Cookware Set", "nonstick-cookware-set", "AMIYO-COOK-001", 399000n, "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&h=900&fit=crop"]
    , ["425", "525", "625", categoryIds.get("fitness-equipment")!, "Adjustable Dumbbell Pair", "adjustable-dumbbell-pair", "AMIYO-FIT-001", 349000n, "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=900&h=900&fit=crop"]
    , ["426", "526", "626", categoryIds.get("learning-toys")!, "Wooden Learning Blocks", "wooden-learning-blocks", "AMIYO-TOY-001", 89000n, "https://images.unsplash.com/photo-1598880940080-ff9a29891b85?w=900&h=900&fit=crop"]
    , ["427", "527", "627", categoryIds.get("books")!, "Bangla Fiction Collection", "bangla-fiction-collection", "AMIYO-BOOK-001", 125000n, "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&h=900&fit=crop"]
    , ["428", "528", "628", categoryIds.get("pet-food")!, "Premium Cat Food", "premium-cat-food", "AMIYO-PET-001", 95000n, "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=900&h=900&fit=crop"]
    , ["429", "529", "629", categoryIds.get("garden")!, "Home Gardening Tool Kit", "home-gardening-tool-kit", "AMIYO-GARDEN-001", 145000n, "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900&h=900&fit=crop"]
    , ["430", "530", "630", categoryIds.get("art-craft")!, "Artist Acrylic Paint Set", "artist-acrylic-paint-set", "AMIYO-ART-001", 119000n, "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&h=900&fit=crop"]
    , ["431", "531", "631", categoryIds.get("fresh-fruits")!, "Seasonal Fresh Fruit Box", "seasonal-fresh-fruit-box", "AMIYO-FRUIT-001", 135000n, "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=900&h=900&fit=crop"]
    , ["432", "532", "632", categoryIds.get("travel-accessories")!, "Travel Organizer Bundle", "travel-organizer-bundle", "AMIYO-TRAVEL-001", 99000n, "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=900&h=900&fit=crop"]
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

  const marketingStartsAt = new Date(Date.now() - 60 * 60_000);
  const marketingEndsAt = new Date(Date.now() + 30 * 86_400_000);
  await prisma.voucher.upsert({ where: { id: ids.marketplaceVoucher }, update: { code: "AMIYO20", ownerType: "platform", ownerId: "marketplace", rules: { discountType: "PERCENT", value: 20, minimumSpendMinor: "100000", usageLimit: 500 }, startsAt: marketingStartsAt, endsAt: marketingEndsAt, active: true }, create: { id: ids.marketplaceVoucher, code: "AMIYO20", ownerType: "platform", ownerId: "marketplace", rules: { discountType: "PERCENT", value: 20, minimumSpendMinor: "100000", usageLimit: 500 }, startsAt: marketingStartsAt, endsAt: marketingEndsAt, active: true } });
  await prisma.flashSale.upsert({ where: { id: ids.flashSale }, update: { name: "Amiyo Mega Flash Hour", status: "active", startsAt: marketingStartsAt, endsAt: marketingEndsAt }, create: { id: ids.flashSale, name: "Amiyo Mega Flash Hour", status: "active", startsAt: marketingStartsAt, endsAt: marketingEndsAt } });
  for (const item of [{ productId: ids.product, priceMinor: 199000n, quantityLimit: 25 }, { productId: "00000000-0000-4000-8000-000000000410", priceMinor: 149000n, quantityLimit: 40 }]) await prisma.flashSaleProduct.upsert({ where: { flashSaleId_productId: { flashSaleId: ids.flashSale, productId: item.productId } }, update: { priceMinor: item.priceMinor, quantityLimit: item.quantityLimit }, create: { flashSaleId: ids.flashSale, ...item } });

  const moderationProducts = [
    { suffix: "433", variant: "533", inventory: "633", name: "Vendor Submitted Denim Jacket", slug: "vendor-submitted-denim-jacket", sku: "DHAKA-DENIM-001", status: "SUBMITTED" as const, categoryId: categoryIds.get("mens-clothing")!, priceMinor: 249000n, image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=900&h=900&fit=crop" },
    { suffix: "434", variant: "534", inventory: "634", name: "Draft Canvas Tote Bag", slug: "draft-canvas-tote-bag", sku: "DHAKA-TOTE-001", status: "DRAFT" as const, categoryId: categoryIds.get("womens-accessories")!, priceMinor: 79000n, image: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=900&h=900&fit=crop" },
    { suffix: "435", variant: "535", inventory: "635", name: "Rejected Sample Sunglasses", slug: "rejected-sample-sunglasses", sku: "DHAKA-SUN-001", status: "REJECTED" as const, categoryId: categoryIds.get("eyewear-accessories")!, priceMinor: 119000n, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=900&h=900&fit=crop" }
  ];
  for (const item of moderationProducts) {
    const productId = `00000000-0000-4000-8000-000000000${item.suffix}`;
    await prisma.product.upsert({ where: { id: productId }, update: { status: item.status, name: item.name, categoryId: item.categoryId, publishedAt: null }, create: { id: productId, vendorId: fashionVendorId, shopId: fashionShopId, categoryId: item.categoryId, name: item.name, slug: item.slug, description: `${item.name} prepared for admin workflow testing.`, brand: "Dhaka Style", status: item.status, variants: { create: { id: `00000000-0000-4000-8000-000000000${item.variant}`, sku: item.sku, title: "Default", priceMinor: item.priceMinor, inventory: { create: { id: `00000000-0000-4000-8000-000000000${item.inventory}`, onHand: 25, reorderLevel: 5 } } } }, media: { create: { storageKey: item.image, mediaType: "image", mimeType: "image/jpeg", altText: item.name } } } });
  }

  const customerPreferences = {
    notificationPreferences: {
      orderUpdates: { email: true, sms: true, push: true }, promotions: { email: true, sms: false, push: false },
      priceDrops: { email: true, sms: false, push: true }, vendorNews: { email: false, sms: false, push: false }
    },
    privacy: { wishlistVisibility: "private", reviewHistoryVisibility: "public", personalization: true }
  };
  await prisma.userProfile.update({ where: { userId: ids.customerUser }, data: { firstName: "Demo", lastName: "Customer", displayName: "Demo Customer", locale: "en", currency: "BDT", preferences: customerPreferences } });
  await prisma.address.upsert({ where: { id: ids.customerAddress }, update: { isDefault: true }, create: { id: ids.customerAddress, userId: ids.customerUser, label: "Home", recipientName: "Demo Customer", phone: "01700000000", line1: "House 12, Road 7", division: "Dhaka", district: "Dhaka", upazila: "Dhanmondi", postalCode: "1209", isDefault: true } });
  const couponStartsAt = new Date(Date.now() - 86_400_000);
  const couponEndsAt = new Date(Date.now() + 365 * 86_400_000);
  await prisma.coupon.upsert({ where: { code: "SAVE10" }, update: { discountType: "PERCENT", value: 10, maxDiscountMinor: 100000n, minimumSpendMinor: 50000n, startsAt: couponStartsAt, endsAt: couponEndsAt, active: true }, create: { code: "SAVE10", discountType: "PERCENT", value: 10, maxDiscountMinor: 100000n, minimumSpendMinor: 50000n, usageLimit: 1000, perUserLimit: 5, startsAt: couponStartsAt, endsAt: couponEndsAt, active: true } });
  const orderPlacedAt = new Date(Date.now() - 3 * 86_400_000);
  await prisma.order.upsert({ where: { id: ids.customerOrder }, update: { status: "SHIPPED", userId: ids.customerUser }, create: { id: ids.customerOrder, orderNumber: "AG-DEMO-1001", userId: ids.customerUser, status: "SHIPPED", subtotalMinor: 249000n, deliveryMinor: 6000n, totalMinor: 255000n, placedAt: orderPlacedAt, createdAt: orderPlacedAt } });
  await prisma.orderAddress.upsert({ where: { orderId_type: { orderId: ids.customerOrder, type: "delivery" } }, update: {}, create: { orderId: ids.customerOrder, type: "delivery", recipientName: "Demo Customer", phone: "01700000000", line1: "House 12, Road 7", division: "Dhaka", district: "Dhaka", upazila: "Dhanmondi", postalCode: "1209" } });
  await prisma.vendorOrder.upsert({ where: { id: ids.customerVendorOrder }, update: { status: "IN_TRANSIT" }, create: { id: ids.customerVendorOrder, orderId: ids.customerOrder, vendorId: ids.vendor, shopId: ids.shop, status: "IN_TRANSIT", subtotalMinor: 249000n, deliveryMinor: 6000n, totalMinor: 255000n, commissionMinor: 24900n, createdAt: orderPlacedAt } });
  await prisma.orderItem.upsert({ where: { id: ids.customerOrderItem }, update: {}, create: { id: ids.customerOrderItem, orderId: ids.customerOrder, vendorOrderId: ids.customerVendorOrder, productId: ids.product, variantId: ids.variant, productNameSnapshot: "Premium Wireless Headphones", skuSnapshot: "AMIYO-WH-001-BLK", attributesSnapshot: { color: "Black" }, quantity: 1, unitPriceMinor: 249000n, lineTotalMinor: 249000n } });
  const returnOrderPlacedAt = new Date(Date.now() - 12 * 86_400_000);
  await prisma.order.upsert({ where: { id: ids.returnOrder }, update: { status: "DELIVERED", userId: ids.customerUser }, create: { id: ids.returnOrder, orderNumber: "AG-DEMO-RETURN-1002", userId: ids.customerUser, status: "DELIVERED", subtotalMinor: 249000n, deliveryMinor: 6000n, totalMinor: 255000n, placedAt: returnOrderPlacedAt, createdAt: returnOrderPlacedAt } });
  await prisma.vendorOrder.upsert({ where: { id: ids.returnVendorOrder }, update: { status: "DELIVERED" }, create: { id: ids.returnVendorOrder, orderId: ids.returnOrder, vendorId: ids.vendor, shopId: ids.shop, status: "DELIVERED", subtotalMinor: 249000n, deliveryMinor: 6000n, totalMinor: 255000n, commissionMinor: 24900n, createdAt: returnOrderPlacedAt } });
  await prisma.orderItem.upsert({ where: { id: ids.returnOrderItem }, update: {}, create: { id: ids.returnOrderItem, orderId: ids.returnOrder, vendorOrderId: ids.returnVendorOrder, productId: ids.product, variantId: ids.variant, productNameSnapshot: "Premium Wireless Headphones", skuSnapshot: "AMIYO-WH-001-BLK", attributesSnapshot: { color: "Black" }, quantity: 1, unitPriceMinor: 249000n, lineTotalMinor: 249000n } });
  await prisma.payment.upsert({ where: { id: ids.returnPayment }, update: { status: "CAPTURED" }, create: { id: ids.returnPayment, orderId: ids.returnOrder, provider: "sslcommerz", method: "card", status: "CAPTURED", amountMinor: 255000n, currency: "BDT" } });
  await prisma.return.upsert({ where: { id: ids.returnCase }, update: { status: "REVIEWING", reasonCode: "DAMAGED_ITEM", reasonDetail: "The headphone box arrived crushed and the left ear cup has a visible scratch.", version: 2 }, create: { id: ids.returnCase, orderId: ids.returnOrder, vendorOrderId: ids.returnVendorOrder, userId: ids.customerUser, status: "REVIEWING", reasonCode: "DAMAGED_ITEM", reasonDetail: "The headphone box arrived crushed and the left ear cup has a visible scratch.", refundMethod: "ORIGINAL_PAYMENT", requestedMinor: 249000n, currency: "BDT", version: 2, createdAt: new Date(returnOrderPlacedAt.getTime() + 9 * 86_400_000) } });
  await prisma.returnItem.upsert({ where: { id: ids.returnItem }, update: { quantity: 1, requestedMinor: 249000n }, create: { id: ids.returnItem, returnId: ids.returnCase, orderItemId: ids.returnOrderItem, quantity: 1, requestedMinor: 249000n } });
  await prisma.returnEvent.upsert({ where: { id: ids.returnEvent }, update: { toStatus: "REVIEWING", note: "Demo return opened for admin decision testing" }, create: { id: ids.returnEvent, returnId: ids.returnCase, fromStatus: "REQUESTED", toStatus: "REVIEWING", actorType: "admin", actorId: ids.adminUser, note: "Demo return opened for admin decision testing", createdAt: new Date(returnOrderPlacedAt.getTime() + 10 * 86_400_000) } });
  await prisma.vendorBankAccount.upsert({ where: { id: ids.vendorBankAccount }, update: { verifiedAt: new Date() }, create: { id: ids.vendorBankAccount, vendorId: ids.vendor, provider: "Demo Bank", accountName: "Amiyo Demo Commerce Ltd", accountNumberMasked: "**** 7788", encryptedPayload: Buffer.from("demo-seeded-bank-account"), isDefault: true, verifiedAt: new Date() } });
  await prisma.vendorPayoutRequest.upsert({ where: { id: ids.payoutRequest }, update: { status: "REQUESTED", version: 1, rejectionReason: null }, create: { id: ids.payoutRequest, vendorId: ids.vendor, bankAccountId: ids.vendorBankAccount, amountMinor: 50000n, currency: "BDT", status: "REQUESTED", version: 1 } });
  await prisma.supportTicket.upsert({ where: { id: ids.customerTicket }, update: { status: "open", priority: "high" }, create: { id: ids.customerTicket, userId: ids.customerUser, orderId: ids.returnOrder, subject: "Return pickup status", category: "returns", priority: "high", status: "open" } });
  await prisma.review.upsert({ where: { id: ids.customerReview }, update: { rating: 4, status: "published" }, create: { id: ids.customerReview, userId: ids.customerUser, productId: ids.product, orderItemId: ids.returnOrderItem, rating: 4, title: "Great sound, packaging issue", body: "The headphones sound excellent, but the delivery packaging needs improvement.", status: "published" } });
  await prisma.payment.upsert({ where: { id: ids.manualPayment }, update: { status: "INITIATED" }, create: { id: ids.manualPayment, orderId: ids.customerOrder, provider: "bkash_manual", method: "mobile_banking", status: "INITIATED", amountMinor: 255000n, currency: "BDT" } });
  await prisma.paymentVerification.upsert({ where: { id: ids.paymentVerification }, update: { status: "pending", transactionRef: "BKS-DEMO-778899" }, create: { id: ids.paymentVerification, paymentId: ids.manualPayment, status: "pending", transactionRef: "BKS-DEMO-778899", senderMasked: "017****0002", evidenceStorageKey: "seed/payments/bkash-demo-receipt.jpg" } });
  await prisma.shipment.upsert({ where: { vendorOrderId: ids.customerVendorOrder }, update: { status: "IN_TRANSIT", provider: "Amiyo Delivery", trackingNumber: "AGD-DEMO-1001" }, create: { id: ids.customerShipment, vendorOrderId: ids.customerVendorOrder, status: "IN_TRANSIT", provider: "Amiyo Delivery", trackingNumber: "AGD-DEMO-1001", shippedAt: new Date(orderPlacedAt.getTime() + 2 * 86_400_000) } });
  await prisma.logisticsZone.upsert({ where: { id: ids.logisticsZone }, update: { status: "active" }, create: { id: ids.logisticsZone, name: "Dhaka Metro", code: "DHAKA-METRO", districts: ["Dhaka"], courierPartnerIds: [ids.courierPartner], defaultCourierName: "Amiyo Delivery", codAvailable: true, slaHours: 24, sortOrder: 10 } });
  await prisma.courierPartner.upsert({ where: { id: ids.courierPartner }, update: { status: "active" }, create: { id: ids.courierPartner, name: "Amiyo Delivery", code: "AMIYO-DELIVERY", provider: "amiyo_delivery", bookingMode: "manual", coverageType: "metro", outsideDistrict: true, localArea: true, instantDelivery: true, serviceZones: ["DHAKA-METRO"], codSupported: true, baseDeliveryCostMinor: 6000n, codCollectionFeeMinor: 1000n, defaultSlaHours: 24 } });
  await prisma.pickupStaff.upsert({ where: { id: ids.pickupStaff }, update: { status: "active" }, create: { id: ids.pickupStaff, name: "Demo Pickup Rider", phone: "01700000001", email: "rider@amiyo.test", status: "active", routeName: "Dhaka Metro Route", assignedZones: ["DHAKA-METRO"], assignedLocations: [{ division: "Dhaka", district: "Dhaka" }], assignedVendorIds: [ids.vendor], vehicleType: "bike", capacityOrders: 30, shiftStart: "09:00", shiftEnd: "18:00" } });
  await prisma.deliveryFeeRule.upsert({ where: { id: ids.feeRule }, update: { status: "active" }, create: { id: ids.feeRule, name: "Dhaka Metro Standard", ruleType: "zone_rate", status: "active", priority: 10, zoneCode: "DHAKA-METRO", baseFeeMinor: 6000n, feePerKgMinor: 1000n, codFeeMinor: 1000n, redeliveryFeeMinor: 5000n, freeShippingThreshold: 1100000n, paymentMethods: ["COD", "ONLINE"] } });
  await prisma.logisticsAssignment.upsert({ where: { shipmentId: ids.customerShipment }, update: { courierPartnerId: ids.courierPartner, pickupStaffId: ids.pickupStaff, trackingNumber: "AGD-DEMO-1001" }, create: { id: ids.logisticsAssignment, shipmentId: ids.customerShipment, courierPartnerId: ids.courierPartner, pickupStaffId: ids.pickupStaff, bookingMode: "manual", trackingNumber: "AGD-DEMO-1001", pickupDate: new Date(orderPlacedAt.getTime() + 2 * 86_400_000), pickupWindow: "09:00-12:00", estimatedDeliveryDate: new Date(orderPlacedAt.getTime() + 4 * 86_400_000) } });
  await prisma.codRemittance.upsert({ where: { id: ids.codRemittance }, update: { reference: "COD-DEMO-1001" }, create: { id: ids.codRemittance, courierPartnerId: ids.courierPartner, courierName: "Amiyo Delivery", collectedAmountMinor: 255000n, remittedAmountMinor: 200000n, forwardedToVendorMinor: 180000n, reference: "COD-DEMO-1001", notes: "Demo partial remittance for admin workflow testing", orderIds: [ids.customerOrder], createdBy: ids.adminUser } });
  const shipmentEvents = [
    ["1201", "READY_TO_SHIP", "Seller prepared your package", "Dhaka warehouse", new Date(orderPlacedAt.getTime() + 1 * 86_400_000)],
    ["1202", "PICKED_UP", "Courier picked up the package", "Tejgaon hub", new Date(orderPlacedAt.getTime() + 2 * 86_400_000)],
    ["1203", "IN_TRANSIT", "Package is moving to your delivery area", "Dhanmondi delivery hub", new Date(orderPlacedAt.getTime() + 2.5 * 86_400_000)]
  ] as const;
  for (const [suffix, status, description, location, occurredAt] of shipmentEvents) await prisma.shipmentEvent.upsert({ where: { id: `00000000-0000-4000-8000-00000000${suffix}` }, update: { status, description, location, occurredAt }, create: { id: `00000000-0000-4000-8000-00000000${suffix}`, shipmentId: ids.customerShipment, status, description, location, occurredAt } });
}

async function main() {
  await seedAccessControl();
  await seedDemoCatalog();
  const [approvedProducts, categories, shops] = await Promise.all([
    prisma.product.count({ where: { status: "APPROVED" } }),
    prisma.category.count({ where: { status: "active" } }),
    prisma.vendorShop.count({ where: { status: "ACTIVE" } })
  ]);
  console.log(`Catalog seed complete: ${approvedProducts} approved products, ${categories} active categories, ${shops} active shops.`);
}

main().finally(async () => prisma.$disconnect());

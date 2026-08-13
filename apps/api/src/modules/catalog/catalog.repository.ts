import { Prisma, type PrismaClient } from "@prisma/client";
import type { CatalogQuery } from "@amiyo/contracts";

export const publicProductInclude = {
  shop: true,
  media: { orderBy: { displayOrder: "asc" as const } },
  variants: { where: { active: true }, orderBy: { priceMinor: "asc" as const }, include: { inventory: true } },
  _count: { select: { reviews: true } }
} satisfies Prisma.ProductInclude;

export type PublicProduct = Prisma.ProductGetPayload<{ include: typeof publicProductInclude }>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identifierWhere = (identifier: string) => uuidPattern.test(identifier) ? { OR: [{ id: identifier }, { slug: identifier }] } : { slug: identifier };
const shopIdentifierWhere = (identifier: string) => uuidPattern.test(identifier) ? { OR: [{ id: identifier }, { vendorId: identifier }] } : { slug: identifier };

export class CatalogRepository {
  constructor(private readonly client: PrismaClient) {}

  listCategories() {
    return this.client.category.findMany({ where: { status: "active" }, include: { attributes: { include: { options: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
  }

  async listPublishedProducts(input: CatalogQuery) {
    let categoryIds: string[] | undefined;
    if (input.category) {
      const categories = await this.client.category.findMany({ where: { status: "active" }, select: { id: true, parentId: true, slug: true } });
      const selected = categories.find((category) => category.id === input.category || category.slug === input.category);
      if (selected) { categoryIds = [selected.id]; for (let index = 0; index < categoryIds.length; index += 1) categoryIds.push(...categories.filter((category) => category.parentId === categoryIds![index] && !categoryIds!.includes(category.id)).map((category) => category.id)); } else categoryIds = [];
    }
    const rows = await this.client.product.findMany({
      where: {
        status: "APPROVED",
        shop: { status: "ACTIVE", ...(input.shop ? identifierWhere(input.shop) : {}) },
        vendor: { status: "APPROVED" },
        ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
        ...(input.query ? { OR: [
          { name: { contains: input.query, mode: "insensitive" } },
          { brand: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } }
        ] } : {})
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      take: input.limit + 1,
      include: publicProductInclude
    });
    const hasNextPage = rows.length > input.limit;
    const data = hasNextPage ? rows.slice(0, input.limit) : rows;
    return { data, pageInfo: { hasNextPage, nextCursor: hasNextPage ? data.at(-1)?.id ?? null : null } };
  }

  getPublishedProduct(identifier: string) {
    return this.client.product.findFirst({
      where: { ...identifierWhere(identifier), status: "APPROVED", shop: { status: "ACTIVE" }, vendor: { status: "APPROVED" } },
      include: publicProductInclude
    });
  }

  async listShops(cursor: string | undefined, limit: number) {
    const rows = await this.client.vendorShop.findMany({
      where: { status: "ACTIVE", vendor: { status: "APPROVED" } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
      include: { _count: { select: { products: { where: { status: "APPROVED" } } } } }
    });
    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    return { data, pageInfo: { hasNextPage, nextCursor: hasNextPage ? data.at(-1)?.id ?? null : null } };
  }

  getShop(identifier: string) {
    return this.client.vendorShop.findFirst({
      where: { ...shopIdentifierWhere(identifier), status: "ACTIVE", vendor: { status: "APPROVED" } },
      include: { _count: { select: { products: { where: { status: "APPROVED" } } } } }
    });
  }
}

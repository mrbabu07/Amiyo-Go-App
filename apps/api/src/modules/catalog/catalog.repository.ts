import type { PrismaClient } from "@prisma/client";

export type ListPublishedProductsInput = {
  cursor?: string;
  limit: number;
};

export class CatalogRepository {
  constructor(private readonly client: PrismaClient) {}

  async listPublishedProducts({ cursor, limit }: ListPublishedProductsInput) {
    const rows = await this.client.product.findMany({
      where: { status: "APPROVED", shop: { status: "ACTIVE" }, vendor: { status: "APPROVED" } },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor } } : {}),
      skip: cursor ? 1 : 0,
      take: limit + 1,
      include: {
        media: { orderBy: { displayOrder: "asc" }, take: 1 },
        variants: { where: { active: true }, orderBy: { priceMinor: "asc" }, include: { inventory: true } }
      }
    });
    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    return { data, pageInfo: { hasNextPage, nextCursor: hasNextPage ? data.at(-1)?.id ?? null : null } };
  }
}

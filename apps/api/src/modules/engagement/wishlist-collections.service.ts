import { wishlistCollectionInputSchema } from "@amiyo/contracts";
import type { PrismaClient } from "@prisma/client";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";

export class WishlistCollectionsService {
  constructor(private readonly client: PrismaClient) {}

  async list(userId: string) {
    const rows = await this.client.wishlist.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true, name: true, isDefault: true, _count: { select: { items: true } } }
    });
    return rows.map(({ _count, ...row }) => ({ ...row, itemCount: _count.items }));
  }

  async create(userId: string, input: unknown) {
    const { name } = wishlistCollectionInputSchema.parse(input);
    return withSerializableTransaction(this.client, async (transaction) => {
      const count = await transaction.wishlist.count({ where: { userId, isDefault: false } });
      if (count >= 20) throw new ApiProblem(409, "WISHLIST_COLLECTION_LIMIT", "You can create up to 20 collections");
      const row = await transaction.wishlist.create({ data: { userId, name, isDefault: false } });
      return { id: row.id, name: row.name, isDefault: false, itemCount: 0 };
    });
  }

  async rename(userId: string, id: string, input: unknown) {
    const { name } = wishlistCollectionInputSchema.parse(input);
    const result = await this.client.wishlist.updateMany({ where: { id, userId, isDefault: false }, data: { name } });
    if (!result.count) throw new ApiProblem(404, "WISHLIST_COLLECTION_NOT_FOUND", "Editable collection not found");
  }

  async remove(userId: string, id: string) {
    const result = await this.client.wishlist.deleteMany({ where: { id, userId, isDefault: false } });
    if (!result.count) throw new ApiProblem(404, "WISHLIST_COLLECTION_NOT_FOUND", "Deletable collection not found");
  }
}

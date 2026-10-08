import type { PrismaClient } from "@prisma/client";
import { ApiProblem } from "../../middleware/api-problem.js";

export class FlashAlertService {
  constructor(private readonly client: PrismaClient) {}

  async list(userId: string) {
    const rows = await this.client.flashSaleAlert.findMany({ where: { userId, active: true }, include: { product: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
    return rows.map((row) => ({ id: row.id, productId: row.productId, productName: row.product.name, createdAt: row.createdAt.toISOString() }));
  }

  async save(userId: string, productId: string) {
    const product = await this.client.product.findFirst({ where: { id: productId, status: "APPROVED", shop: { status: "ACTIVE" }, vendor: { status: "APPROVED" } }, select: { id: true } });
    if (!product) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    await this.client.flashSaleAlert.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId }, update: { active: true } });
    return this.list(userId);
  }

  async remove(userId: string, productId: string) {
    await this.client.flashSaleAlert.updateMany({ where: { userId, productId }, data: { active: false } });
    return this.list(userId);
  }
}

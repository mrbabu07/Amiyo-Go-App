import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { CatalogRepository } from "./catalog.repository.js";

test("product slug lookup never reaches the UUID column", async () => {
  let where: Record<string, unknown> | undefined;
  const client = { product: { findFirst: async (input: { where: Record<string, unknown> }) => { where = input.where; return null; } } } as unknown as PrismaClient;
  await new CatalogRepository(client).getPublishedProduct("seasonal-fresh-fruit-box");
  assert.equal(where?.slug, "seasonal-fresh-fruit-box");
  assert.equal(where?.OR, undefined);
});

test("UUID product lookup retains ID and slug compatibility", async () => {
  let where: Record<string, unknown> | undefined;
  const identifier = "00000000-0000-4000-8000-000000000401";
  const client = { product: { findFirst: async (input: { where: Record<string, unknown> }) => { where = input.where; return null; } } } as unknown as PrismaClient;
  await new CatalogRepository(client).getPublishedProduct(identifier);
  assert.deepEqual(where?.OR, [{ id: identifier }, { slug: identifier }]);
});

test("shop slug lookup never reaches the UUID column", async () => {
  let where: Record<string, unknown> | undefined;
  const client = { vendorShop: { findFirst: async (input: { where: Record<string, unknown> }) => { where = input.where; return null; } } } as unknown as PrismaClient;
  await new CatalogRepository(client).getShop("tech-gallery");
  assert.equal(where?.slug, "tech-gallery");
  assert.equal(where?.OR, undefined);
});

test("UUID shop lookup accepts the legacy vendor identifier", async () => {
  let where: Record<string, unknown> | undefined;
  const identifier = "00000000-0000-4000-8000-000000000201";
  const client = { vendorShop: { findFirst: async (input: { where: Record<string, unknown> }) => { where = input.where; return null; } } } as unknown as PrismaClient;
  await new CatalogRepository(client).getShop(identifier);
  assert.deepEqual(where?.OR, [{ id: identifier }, { vendorId: identifier }]);
});

test("category navigation excludes heavy attribute relations", async () => {
  let query: Record<string, unknown> | undefined;
  const client = { category: { findMany: async (input: Record<string, unknown>) => { query = input; return []; } } } as unknown as PrismaClient;
  await new CatalogRepository(client).listCategoryNavigation();
  assert.equal(query?.include, undefined);
  assert.deepEqual((query?.select as Record<string, unknown>)?.id, true);
  assert.equal((query?.select as Record<string, unknown>)?.attributes, undefined);
});

test("product lists fetch only the first media and cheapest variant", async () => {
  let query: { include?: { media?: { take?: number }; variants?: { take?: number } } } | undefined;
  const client = { product: { findMany: async (input: typeof query) => { query = input; return []; } } } as unknown as PrismaClient;
  await new CatalogRepository(client).listPublishedProducts({ limit: 20, sort: "newest" });
  assert.equal(query?.include?.media?.take, 1);
  assert.equal(query?.include?.variants?.take, 1);
});

import assert from "node:assert/strict";
import test from "node:test";
import { parseProductCsv, serializeProductCsv } from "./product-csv.js";

const shopId = "11111111-1111-4111-8111-111111111111"; const categoryId = "22222222-2222-4222-8222-222222222222";
test("bulk product CSV supports quoted fields and round-trip export", () => { const products = parseProductCsv({ shopId, categoryId, csv: 'name,slug,sku,priceMinor,stock,description\n"Cotton, Shirt",cotton-shirt,SKU-100,129900,8,"Soft, breathable"' }); assert.equal(products[0]?.name, "Cotton, Shirt"); const csv = serializeProductCsv([{ name: products[0]!.name, slug: products[0]!.slug, description: products[0]!.description ?? null, brand: null, variants: [{ sku: "SKU-100", title: "Default", priceMinor: 129900n, compareAtMinor: null, inventory: { onHand: 8 } }] }]); assert.match(csv, /"Cotton, Shirt"/); });
test("bulk product CSV rejects duplicate identifiers", () => { assert.throws(() => parseProductCsv({ shopId, categoryId, csv: "name,slug,sku,priceMinor,stock\nOne,one,SKU-1,100,1\nTwo,one,SKU-2,200,2" }), /duplicate product slugs/); });

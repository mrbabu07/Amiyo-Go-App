import type { BulkProductCsvInput, CreateProductInput } from "@amiyo/contracts";
import { createProductSchema } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";

const requiredHeaders = ["name", "slug", "sku", "priceMinor", "stock"] as const;

export function parseProductCsv(input: BulkProductCsvInput): CreateProductInput[] {
  const records = parseCsv(input.csv);
  if (records.length < 2) throw new ApiProblem(400, "BULK_CSV_EMPTY", "CSV must contain a header and at least one product row");
  const headers = records[0]!.map((value) => value.trim());
  for (const header of requiredHeaders) if (!headers.includes(header)) throw new ApiProblem(400, "BULK_CSV_HEADER_INVALID", `CSV header '${header}' is required`);
  const products = records.slice(1).filter((record) => record.some((value) => value.trim())).map((record, index) => {
    const row = Object.fromEntries(headers.map((header, column) => [header, record[column]?.trim() ?? ""]));
    const result = createProductSchema.safeParse({ shopId: input.shopId, categoryId: input.categoryId, name: row.name, slug: row.slug, description: row.description || null, brand: row.brand || null, variants: [{ sku: row.sku, title: row.variantTitle || "Default", priceMinor: row.priceMinor, compareAtMinor: row.compareAtMinor || null, currency: "BDT", onHand: Number(row.stock) }] });
    if (!result.success) throw new ApiProblem(400, "BULK_CSV_ROW_INVALID", `CSV row ${index + 2} is invalid: ${result.error.issues[0]?.message ?? "Invalid data"}`);
    return result.data;
  });
  if (products.length > 100) throw new ApiProblem(400, "BULK_CSV_LIMIT", "A bulk import supports at most 100 products");
  const slugs = products.map((product) => product.slug); const skus = products.flatMap((product) => product.variants.map((variant) => variant.sku));
  if (new Set(slugs).size !== slugs.length) throw new ApiProblem(400, "BULK_CSV_DUPLICATE_SLUG", "CSV contains duplicate product slugs");
  if (new Set(skus).size !== skus.length) throw new ApiProblem(400, "BULK_CSV_DUPLICATE_SKU", "CSV contains duplicate SKUs");
  return products;
}

export function serializeProductCsv(products: Array<{ name: string; slug: string; description: string | null; brand: string | null; variants: Array<{ sku: string; title: string; priceMinor: bigint; compareAtMinor: bigint | null; inventory: { onHand: number } | null }> }>) {
  const rows = [["name", "slug", "sku", "variantTitle", "priceMinor", "compareAtMinor", "stock", "description", "brand"]];
  for (const product of products) for (const variant of product.variants) rows.push([product.name, product.slug, variant.sku, variant.title, variant.priceMinor.toString(), variant.compareAtMinor?.toString() ?? "", String(variant.inventory?.onHand ?? 0), product.description ?? "", product.brand ?? ""]);
  return `${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

function escapeCsv(value: string) { return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value; }
function parseCsv(csv: string) { const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false; for (let index = 0; index < csv.length; index += 1) { const character = csv[index]!; if (quoted) { if (character === '"' && csv[index + 1] === '"') { value += '"'; index += 1; } else if (character === '"') quoted = false; else value += character; } else if (character === '"') quoted = true; else if (character === ",") { row.push(value); value = ""; } else if (character === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; } else value += character; } if (quoted) throw new ApiProblem(400, "BULK_CSV_QUOTE_INVALID", "CSV contains an unterminated quoted value"); if (value || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); } return rows; }

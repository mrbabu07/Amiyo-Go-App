import type { FulfillmentDocument } from "@amiyo/contracts";
import { fulfillmentHtml } from "./fulfillment-html";

export const batchDocumentLimit = 20;

export async function loadBatchDocuments(ids: string[], load: (id: string) => Promise<FulfillmentDocument>) {
  const unique = [...new Set(ids)];
  if (!unique.length || unique.length > batchDocumentLimit) throw new Error(`Select 1 to ${batchDocumentLimit} packages.`);
  const documents: FulfillmentDocument[] = [];
  for (const id of unique) documents.push(await load(id));
  return documents;
}

export function batchFulfillmentHtml(documents: FulfillmentDocument[], images: string[], kind: "parcel" | "packing") {
  if (!documents.length || documents.length > batchDocumentLimit || documents.length !== images.length) throw new Error("Invalid document batch.");
  const pages = documents.map((document, index) => fulfillmentHtml(document, images[index]!, kind));
  const head = pages[0]!.split("</head>")[0];
  const bodies = pages.map((page) => `<section class="package">${page.split("<body>")[1]!.split("</body>")[0]}</section>`).join("");
  return `${head}<style>.package + .package{break-before:page;page-break-before:always}</style></head><body>${bodies}</body></html>`;
}

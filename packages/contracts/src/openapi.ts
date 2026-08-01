import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { categorySchema, productDetailSchema, productListResponseSchema } from "./catalog.js";
import { healthResponseSchema } from "./health.js";
import { addressInputSchema, addressSchema, deviceInputSchema, deviceSchema, sessionSchema, updateProfileSchema } from "./identity.js";
import { orderSchema } from "./orders.js";
import { problemSchema } from "./problem.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const problem = registry.register("Problem", problemSchema);
const health = registry.register("Health", healthResponseSchema);
const category = registry.register("Category", categorySchema);
const product = registry.register("Product", productDetailSchema);
const productList = registry.register("ProductList", productListResponseSchema);
const order = registry.register("Order", orderSchema);
const session = registry.register("IdentitySession", sessionSchema);
const address = registry.register("Address", addressSchema);
const device = registry.register("Device", deviceSchema);
registry.registerComponent("securitySchemes", "firebaseBearer", { type: "http", scheme: "bearer", bearerFormat: "Firebase ID token" });
const firebaseSecurity = [{ firebaseBearer: [] }];

const errorResponses = {
  400: { description: "Invalid request", content: { "application/problem+json": { schema: problem } } },
  401: { description: "Authentication required", content: { "application/problem+json": { schema: problem } } },
  403: { description: "Insufficient permission", content: { "application/problem+json": { schema: problem } } },
  404: { description: "Resource not found", content: { "application/problem+json": { schema: problem } } }
};

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Operations"],
  responses: { 200: { description: "Service health", content: { "application/json": { schema: health } } } }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/auth/session",
  tags: ["Identity"],
  security: firebaseSecurity,
  responses: { 200: { description: "Synchronized trusted user session", content: { "application/json": { schema: session } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/me",
  tags: ["Identity"],
  security: firebaseSecurity,
  responses: { 200: { description: "Current user profile and authorization context", content: { "application/json": { schema: session } } }, ...errorResponses }
});

registry.registerPath({
  method: "patch",
  path: "/api/v2/me",
  tags: ["Identity"],
  security: firebaseSecurity,
  request: { body: { content: { "application/json": { schema: updateProfileSchema } } } },
  responses: { 200: { description: "Updated profile", content: { "application/json": { schema: session } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/me/addresses",
  tags: ["Identity"],
  security: firebaseSecurity,
  responses: { 200: { description: "Current user addresses", content: { "application/json": { schema: z.array(address) } } }, ...errorResponses }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/me/addresses",
  tags: ["Identity"],
  security: firebaseSecurity,
  request: { body: { content: { "application/json": { schema: addressInputSchema } } } },
  responses: { 201: { description: "Created address", content: { "application/json": { schema: address } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/devices",
  tags: ["Identity"],
  security: firebaseSecurity,
  responses: { 200: { description: "Registered devices", content: { "application/json": { schema: z.array(device) } } }, ...errorResponses }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/devices",
  tags: ["Identity"],
  security: firebaseSecurity,
  request: { body: { content: { "application/json": { schema: deviceInputSchema } } } },
  responses: { 201: { description: "Registered device", content: { "application/json": { schema: device } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/catalog/categories",
  tags: ["Catalog"],
  responses: { 200: { description: "Active catalog categories", content: { "application/json": { schema: z.array(category) } } } }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/catalog/products",
  tags: ["Catalog"],
  request: { query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).optional(), query: z.string().optional() }) },
  responses: { 200: { description: "Cursor-paginated products", content: { "application/json": { schema: productList } } } }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/catalog/products/{id}",
  tags: ["Catalog"],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: { description: "Product detail", content: { "application/json": { schema: product } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/orders/{id}",
  tags: ["Orders"],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: { description: "Order detail", content: { "application/json": { schema: order } } }, ...errorResponses }
});

export function createOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: { title: "Amiyo-Go API", version: "0.2.0", description: "Typed API contract for the Amiyo-Go mobile platform." },
    servers: [{ url: "http://localhost:4000", description: "Local development" }],
    tags: [{ name: "Operations" }, { name: "Identity" }, { name: "Catalog" }, { name: "Orders" }]
  });
}

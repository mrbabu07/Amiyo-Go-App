import { mkdir, writeFile } from "node:fs/promises";
import { createOpenApiDocument } from "../packages/contracts/dist/openapi.js";

const outputDirectory = new URL("../docs/api/", import.meta.url);
const outputFile = new URL("openapi.json", outputDirectory);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`, "utf8");

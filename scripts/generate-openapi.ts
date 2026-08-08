import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildOpenApiDocument } from "../src/lib/openapi";

// Writes openapi.json at the repo root. Run with `npm run api:spec`.
const doc = buildOpenApiDocument();
const out = resolve(process.cwd(), "openapi.json");
writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");

const pathCount = Object.keys(doc.paths).length;
const schemaCount = Object.keys(doc.components.schemas).length;
console.log(`Wrote ${out}`);
console.log(`  ${pathCount} paths, ${schemaCount} schemas`);

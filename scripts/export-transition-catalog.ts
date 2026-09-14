/**
 * Writes client/assets/transitions/catalog.json from the server catalog source.
 * Run: npx tsx scripts/export-transition-catalog.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildTransitionCatalog } from "../lib/transitions";

const catalog = buildTransitionCatalog();
const out = resolve(
  __dirname,
  "../../client/assets/transitions/catalog.json",
);
writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Wrote ${out} (v${catalog.version}, ${catalog.items.length} items)`);

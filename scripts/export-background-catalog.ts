/**
 * Writes client/assets/backgrounds/catalog.json from the server seed.
 * Run: npm run export:backgrounds
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBackgroundCatalog } from "../lib/backgrounds";

const catalog = buildBackgroundCatalog("");
catalog.baseUrl = "";
const out = resolve(__dirname, "../../client/assets/backgrounds/catalog.json");
writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Wrote ${out} (v${catalog.version}, items=${catalog.items.length})`);

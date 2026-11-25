/**
 * Writes client/test/fixtures/text_packs_catalog.json from the server catalog
 * seed for unit tests. The app no longer ships a bundled catalog — runtime
 * always fetches from the server and caches to disk.
 * Run: npm run export:text-packs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCatalog } from "../lib/catalog";

const catalog = buildCatalog("");
catalog.baseUrl = "";
const out = resolve(
  __dirname,
  "../../client/test/fixtures/text_packs_catalog.json",
);
writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
const counts = catalog.categories.map((c) => `${c.id}=${c.items.length}`).join(" ");
console.log(`Wrote ${out} (v${catalog.version}, ${counts})`);

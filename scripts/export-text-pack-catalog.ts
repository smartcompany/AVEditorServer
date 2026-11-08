/**
 * Writes client/assets/text_packs/catalog.json (the offline bundle) from the
 * server catalog source, so the app ships the same effects/templates.
 * Run: npm run export:text-packs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCatalog } from "../lib/catalog";

const catalog = buildCatalog("");
// Bundled copy resolves relative URLs against the configured server.
catalog.baseUrl = "";
const out = resolve(__dirname, "../../client/assets/text_packs/catalog.json");
writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
const counts = catalog.categories.map((c) => `${c.id}=${c.items.length}`).join(" ");
console.log(`Wrote ${out} (v${catalog.version}, ${counts})`);

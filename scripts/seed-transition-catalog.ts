/**
 * Uploads the TypeScript seed catalog to Supabase Storage.
 * Run: npm run seed:transitions
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildTransitionCatalog } from "../lib/transitions";
import {
  CATALOG_OBJECT_KEY,
  putTransitionCatalog,
} from "../lib/transition-catalog-store";
import { storageBucket } from "../lib/supabase";

function loadEnvLocal() {
  const path = resolve(__dirname, "../.env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();
  const seed = buildTransitionCatalog();
  const saved = await putTransitionCatalog(seed);
  console.log(
    `Seeded ${storageBucket()}/${CATALOG_OBJECT_KEY} ` +
      `(v${saved.version}, ${saved.items.length} items)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

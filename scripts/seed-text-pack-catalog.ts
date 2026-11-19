/**
 * Uploads the TypeScript text-pack seed catalog to Supabase Storage.
 * Run: npx tsx scripts/seed-text-pack-catalog.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildCatalog } from "../lib/catalog";
import {
  TEXT_CATALOG_OBJECT_KEY,
  putTextPackCatalog,
} from "../lib/text-catalog-store";
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
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();
  const seed = buildCatalog("https://aveditorserver.vercel.app/");
  const saved = await putTextPackCatalog(seed);
  const paid = saved.categories
    .flatMap((c) => c.items)
    .filter((i) => i.accessTier && i.accessTier !== "free");
  console.log(
    `Seeded ${storageBucket()}/${TEXT_CATALOG_OBJECT_KEY} ` +
      `(v${saved.version}, paid=${paid.length})`,
  );
  console.log(
    paid.map((i) => `${i.id}:${i.accessTier}`).join(", ") || "(none)",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Backfill rating + reviewCount in data/listings-export.csv from Airbnb listing pages.
 *
 * Usage:
 *   node scripts/enrich-listing-stats.mjs              # rows missing reviewCount
 *   node scripts/enrich-listing-stats.mjs --limit 20   # test batch
 *   node scripts/enrich-listing-stats.mjs --force      # refresh all rows
 *   node scripts/enrich-listing-stats.mjs --id 1213182528278699490
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { fetchListingStats } from "./lib/airbnb-stats.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const csvPath = join(root, "data/listings-export.csv");

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const LIMIT = getArg("--limit") ? parseInt(getArg("--limit"), 10) : null;
const SINGLE_ID = getArg("--id");
const FORCE = hasFlag("--force");
const DRY_RUN = hasFlag("--dry-run");
const DELAY_MS = parseInt(getArg("--delay") ?? "750", 10);
const SAVE_EVERY = 25;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      if (char === "\r") i++;
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function escapeCsvField(value) {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\n") + "\n";
}

function isEmpty(value) {
  return String(value ?? "").trim() === "";
}

async function main() {
  if (!existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const raw = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(raw);
  const headers = rows[0];
  const ratingIdx = headers.indexOf("rating");
  const reviewIdx = headers.indexOf("reviewCount");
  const airbnbIdx = headers.indexOf("airbnbId");
  const activeIdx = headers.indexOf("active");

  if (ratingIdx === -1 || reviewIdx === -1 || airbnbIdx === -1) {
    console.error("CSV missing required columns: rating, reviewCount, airbnbId");
    process.exit(1);
  }

  const targets = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const airbnbId = row[airbnbIdx];
    if (!airbnbId) continue;
    if (SINGLE_ID && airbnbId !== SINGLE_ID) continue;
    if (activeIdx !== -1 && row[activeIdx] !== "yes") continue;
    if (!FORCE && !isEmpty(row[reviewIdx])) continue;
    targets.push(i);
  }

  const toProcess = LIMIT != null ? targets.slice(0, LIMIT) : targets;
  console.log(`Enriching ${toProcess.length} listing(s)…`);

  let updated = 0;
  let failed = 0;

  for (let n = 0; n < toProcess.length; n++) {
    const rowIndex = toProcess[n];
    const row = rows[rowIndex];
    const airbnbId = row[airbnbIdx];
    const title = row[headers.indexOf("title")] ?? airbnbId;

    try {
      const stats = await fetchListingStats(airbnbId, { delayMs: n === 0 ? 0 : DELAY_MS });
      const parts = [];
      if (stats.rating != null) {
        row[ratingIdx] = String(stats.rating);
        parts.push(`rating=${stats.rating}`);
      }
      if (stats.reviewCount != null) {
        row[reviewIdx] = String(stats.reviewCount);
        parts.push(`reviews=${stats.reviewCount}`);
      }

      if (parts.length === 0) {
        console.warn(`  ⚠ No stats found: ${title.slice(0, 50)}`);
        failed++;
      } else {
        console.log(`  ✓ ${title.slice(0, 50)} — ${parts.join(", ")}`);
        updated++;
      }
    } catch (error) {
      console.warn(`  ✗ ${title.slice(0, 50)} — ${error.message}`);
      failed++;
    }

    if (!DRY_RUN && updated > 0 && updated % SAVE_EVERY === 0) {
      writeFileSync(csvPath, rowsToCsv(rows));
      console.log(`  … saved progress (${updated} updated)`);
    }
  }

  if (!DRY_RUN && updated > 0) {
    writeFileSync(csvPath, rowsToCsv(rows));
  }

  console.log(`Done. Updated ${updated}, failed ${failed}${DRY_RUN ? " (dry run)" : ""}.`);
  if (!DRY_RUN && updated > 0) {
    console.log("Run: pnpm data:json");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

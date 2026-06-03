/**
 * import-listings-csv.mjs
 * =======================
 * Import listings from a Manus database CSV export into the local MySQL DB.
 *
 * Usage:
 *   node data/import-listings-csv.mjs
 *   node data/import-listings-csv.mjs --file ../listings_20260603_043912.csv
 *   node data/import-listings-csv.mjs --file ./listings.csv --dry-run
 *
 * Requires DATABASE_URL in .env (see .env.example).
 */

import { readFileSync, existsSync } from "fs";
import { createConnection } from "mysql2/promise";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const VALID_SIGNAL_SOURCES = new Set([
  "badge_publication",
  "badge_designer",
  "text_match",
  "manual",
]);

const EXPECTED_COLUMNS = [
  "id",
  "airbnbId",
  "title",
  "imageUrl",
  "airbnbUrl",
  "rating",
  "reviewCount",
  "pricePerNight",
  "city",
  "region",
  "country",
  "latitude",
  "longitude",
  "description",
  "publications",
  "designers",
  "categories",
  "signalSource",
  "confidence",
  "active",
  "indexedAt",
  "updatedAt",
  "bedrooms",
];

function parseArgs(argv) {
  let file = null;
  let dryRun = false;

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--file" && argv[i + 1]) {
      file = argv[++i];
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(`Usage: node data/import-listings-csv.mjs [--file path/to.csv] [--dry-run]`);
      process.exit(0);
    }
  }

  return { file, dryRun };
}

function resolveDefaultCsvPath() {
  const root = join(__dirname, "..");
  const candidates = [
    join(__dirname, "listings-export.csv"),
    join(root, "listings-export.csv"),
    join(root, "listings_20260603_043912.csv"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }

  return candidates[0];
}

/** RFC 4180-style CSV parser (handles quoted fields with commas/newlines). */
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

function emptyToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function parseIntOrNull(value) {
  const v = emptyToNull(value);
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function parseFloatOrNull(value) {
  const v = emptyToNull(value);
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function normalizeSignalSource(value) {
  const v = emptyToNull(value);
  if (v && VALID_SIGNAL_SOURCES.has(v)) return v;
  return "text_match";
}

function normalizeActive(value) {
  return value === "no" ? "no" : "yes";
}

function rowToRecord(headers, values) {
  const record = {};
  for (let i = 0; i < headers.length; i++) {
    record[headers[i]] = values[i] ?? "";
  }
  return record;
}

function validateHeaders(headers) {
  const missing = EXPECTED_COLUMNS.filter((col) => col !== "id" && !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`CSV is missing expected columns: ${missing.join(", ")}`);
  }
}

async function upsertListing(conn, record) {
  const airbnbId = emptyToNull(record.airbnbId);
  const title = emptyToNull(record.title);
  const airbnbUrl = emptyToNull(record.airbnbUrl);

  if (!airbnbId || !title || !airbnbUrl) {
    return { ok: false, reason: "missing airbnbId, title, or airbnbUrl" };
  }

  await conn.execute(
    `INSERT INTO listings (
      airbnbId, title, imageUrl, airbnbUrl, rating, reviewCount, pricePerNight,
      city, region, country, latitude, longitude, description,
      publications, designers, categories, signalSource, confidence, active,
      indexedAt, updatedAt, bedrooms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      imageUrl = VALUES(imageUrl),
      airbnbUrl = VALUES(airbnbUrl),
      rating = VALUES(rating),
      reviewCount = VALUES(reviewCount),
      pricePerNight = VALUES(pricePerNight),
      city = VALUES(city),
      region = VALUES(region),
      country = VALUES(country),
      latitude = VALUES(latitude),
      longitude = VALUES(longitude),
      description = VALUES(description),
      publications = VALUES(publications),
      designers = VALUES(designers),
      categories = VALUES(categories),
      signalSource = VALUES(signalSource),
      confidence = VALUES(confidence),
      active = VALUES(active),
      indexedAt = VALUES(indexedAt),
      updatedAt = VALUES(updatedAt),
      bedrooms = VALUES(bedrooms)`,
    [
      airbnbId,
      title,
      emptyToNull(record.imageUrl),
      airbnbUrl,
      parseFloatOrNull(record.rating),
      parseIntOrNull(record.reviewCount),
      parseIntOrNull(record.pricePerNight),
      emptyToNull(record.city),
      emptyToNull(record.region),
      emptyToNull(record.country) ?? "US",
      emptyToNull(record.latitude),
      emptyToNull(record.longitude),
      emptyToNull(record.description),
      emptyToNull(record.publications),
      emptyToNull(record.designers),
      emptyToNull(record.categories),
      normalizeSignalSource(record.signalSource),
      parseIntOrNull(record.confidence) ?? 80,
      normalizeActive(record.active),
      emptyToNull(record.indexedAt),
      emptyToNull(record.updatedAt),
      parseIntOrNull(record.bedrooms),
    ]
  );

  return { ok: true };
}

const { file: fileArg, dryRun } = parseArgs(process.argv);
const csvPath = resolve(fileArg ?? resolveDefaultCsvPath());

if (!existsSync(csvPath)) {
  console.error(`ERROR: CSV file not found: ${csvPath}`);
  console.error("Pass --file path/to/listings.csv");
  process.exit(1);
}

if (!process.env.DATABASE_URL && !dryRun) {
  console.error("ERROR: DATABASE_URL not set in .env");
  console.error("Copy .env.example to .env and start MySQL (see docker-compose.yml).");
  process.exit(1);
}

const raw = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const rows = parseCsv(raw);
if (rows.length < 2) {
  console.error("ERROR: CSV appears empty or has no data rows.");
  process.exit(1);
}

const headers = rows[0].map((h) => h.trim());
validateHeaders(headers);

const records = rows.slice(1).map((values) => rowToRecord(headers, values));
console.log(`Found ${records.length} rows in ${csvPath}`);

if (dryRun) {
  const sample = records[0];
  console.log("\nDry run — first row preview:");
  console.log({
    airbnbId: sample.airbnbId,
    title: sample.title?.slice(0, 60),
    region: sample.region,
    categories: sample.categories,
    active: sample.active,
  });
  process.exit(0);
}

const conn = await createConnection(process.env.DATABASE_URL);
let inserted = 0;
let skipped = 0;

console.log("Importing...\n");

for (const record of records) {
  try {
    const result = await upsertListing(conn, record);
    if (result.ok) {
      inserted++;
      if (inserted <= 3 || inserted % 100 === 0) {
        console.log(`  ✓ ${inserted}/${records.length} — ${record.title?.slice(0, 55)}`);
      }
    } else {
      skipped++;
      console.log(`  SKIP: ${result.reason}`);
    }
  } catch (err) {
    skipped++;
    console.error(`  ✗ [${record.airbnbId}] ${err.message}`);
  }
}

const [countRows] = await conn.query(
  "SELECT COUNT(*) AS total, SUM(active = 'yes') AS active FROM listings"
);
await conn.end();

console.log(`\nDone: ${inserted} upserted, ${skipped} skipped.`);
console.log(
  `Database now has ${countRows[0].total} listings (${countRows[0].active} active).`
);

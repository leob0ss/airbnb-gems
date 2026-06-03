/**
 * Convert data/listings-export.csv → client/public/listings.json
 * Run automatically before production builds, or manually:
 *   node scripts/csv-to-json.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const csvPath = join(root, "data/listings-export.csv");
const outPath = join(root, "client/public/listings.json");

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

function parseNumber(value) {
  const v = emptyToNull(value);
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * Airbnb star ratings are 0–5. Scraped averages can slightly exceed 5 (e.g. 5.058)
 * while Airbnb displays 5.0 — cap overflow, don't treat decimals as review counts.
 */
function normalizeRatingReview(rawRating, rawReviewCount) {
  let rating = parseNumber(rawRating);
  let reviewCount = parseNumber(rawReviewCount);

  if (rating != null) {
    if (rating > 5) rating = 5;
    rating = Math.max(0, rating);
  }

  if (reviewCount != null) {
    reviewCount = Math.round(reviewCount);
    if (reviewCount <= 0) reviewCount = null;
  }

  return { rating, reviewCount };
}

function rowToListing(headers, values) {
  const record = {};
  for (let i = 0; i < headers.length; i++) {
    record[headers[i]] = values[i] ?? "";
  }

  if (record.active !== "yes") return null;

  const { rating, reviewCount } = normalizeRatingReview(record.rating, record.reviewCount);

  return {
    id: parseNumber(record.id),
    airbnbId: record.airbnbId,
    title: record.title,
    imageUrl: emptyToNull(record.imageUrl),
    airbnbUrl: record.airbnbUrl,
    rating,
    reviewCount,
    pricePerNight: parseNumber(record.pricePerNight),
    bedrooms: parseNumber(record.bedrooms),
    city: emptyToNull(record.city),
    region: emptyToNull(record.region),
    country: emptyToNull(record.country) ?? "US",
    latitude: emptyToNull(record.latitude),
    longitude: emptyToNull(record.longitude),
    description: emptyToNull(record.description),
    publications: emptyToNull(record.publications),
    designers: emptyToNull(record.designers),
    categories: emptyToNull(record.categories),
    signalSource: record.signalSource || "text_match",
    confidence: parseNumber(record.confidence) ?? 80,
  };
}

if (!existsSync(csvPath)) {
  console.error(`ERROR: CSV not found at ${csvPath}`);
  process.exit(1);
}

const raw = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const rows = parseCsv(raw);
const headers = rows[0].map((h) => h.trim());

const listings = rows
  .slice(1)
  .map((values) => rowToListing(headers, values))
  .filter(Boolean)
  .sort((a, b) => {
    const conf = (b.confidence ?? 0) - (a.confidence ?? 0);
    if (conf !== 0) return conf;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

writeFileSync(outPath, JSON.stringify(listings));
console.log(`Wrote ${listings.length} listings to ${outPath}`);

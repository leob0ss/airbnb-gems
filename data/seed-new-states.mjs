/**
 * seed-new-states.mjs
 * Seeds OR, CO, VT listings from the scraped JSON/log files into the DB.
 * Handles deduplication and caps at 20 HIGH listings per state/category.
 * Run: node data/seed-new-states.mjs
 */
import { readFileSync, existsSync } from "fs";
import { createConnection } from "mysql2/promise";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const MAX_PER_COMBO = 20;

// ─── Category label normalizer ─────────────────────────────────────────────
function normalizeCategory(keyword) {
  if (keyword === "treehouse") return "Treehouse";
  if (keyword === "a-frame") return "A-Frame";
  return keyword;
}

// ─── Rating parser: "4.93 (414)" → 4.93 ──────────────────────────────────
function parseRating(raw) {
  if (!raw) return null;
  const m = String(raw).match(/^([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

// ─── Review count parser: "4.93 (414)" → 414 ─────────────────────────────
function parseReviewCount(raw) {
  if (!raw) return null;
  const m = String(raw).match(/\((\d+)\)/);
  return m ? parseInt(m[1]) : null;
}

// ─── Price parser: "$411" → 411 ───────────────────────────────────────────
function parsePrice(raw) {
  if (!raw) return null;
  const m = String(raw).replace(/,/g, "").match(/\$?([\d]+)/);
  return m ? parseInt(m[1]) : null;
}

// ─── Combos to seed ────────────────────────────────────────────────────────
// Each entry: { state, keyword, region, jsonFile }
const COMBOS = [
  { state: "Oregon",   keyword: "treehouse", region: "OR", jsonFile: "/tmp/oregon-treehouse-highs.json" },
  { state: "Oregon",   keyword: "a-frame",   region: "OR", jsonFile: "/tmp/oregon-aframe-highs.json" },
  { state: "Colorado", keyword: "treehouse", region: "CO", jsonFile: "/tmp/colorado-treehouse-highs.json" },
  // CO A-frame and VT listings don't have JSON files — we'll handle them below
];

// ─── Manual HIGH listings extracted from scrape logs ──────────────────────
// These are the listings that were scored HIGH but whose JSON wasn't saved
// because the scraper was killed before writing the output file.
// We re-fetch their IDs by running a targeted search.

const MANUAL_LISTINGS = {
  "Colorado-a-frame": [
    { name: "Romantic AFrame*Private Trail*Wood Fire*Stargazing", city: "Woodland Park", state: "Colorado" },
    { name: "The Black Bear", city: "Florissant", state: "Colorado" },
    { name: "A-frame*Views*Pikes Peak*Hot Tub", city: "Woodland Park", state: "Colorado" },
    { name: "Indigo A Frame | Dog Inclusive, Hot Tub, Secluded", city: "Divide", state: "Colorado" },
    { name: "The Ascent A-frame", city: "Bayfield", state: "Colorado" },
    { name: "Hello Dreamer A-Frame", city: "Salida", state: "Colorado" },
    { name: "Cute A-Frame w/mountain views, hot tub & fire pit!", city: "Bailey", state: "Colorado" },
    { name: "The Friendship Ranch | Mid-Century MTN A-Frame", city: "Bailey", state: "Colorado" },
    { name: "Cozy, 360° Mountain Views, Dogs OK, 30mi to Breck!", city: "Fairplay", state: "Colorado" },
    { name: "Off-Grid Dark Skies A-Frame Cabin 8400' in CO Mtns", city: "Westcliffe", state: "Colorado" },
    { name: "Secluded A-Frame w/ Hot Tub, Views & Fast Internet", city: "Park County", state: "Colorado" },
    { name: "A-Frame*Hot Tub*Fire Pit*UFO*Mini A-Frame", city: "Crestone", state: "Colorado" },
  ],
  "Vermont-treehouse": [
    { name: "Beautiful timber-frame treehouse", city: "Wilmington", state: "Vermont" },
    { name: "Secluded Luxury Treehouse - Hot Tub + Projector", city: "Newport", state: "Vermont" },
    { name: "Vermont Treehouse with Hot Tub — Open All Winter", city: "Newport", state: "Vermont" },
    { name: "Weasley's Enchanted Treehouse @ Vermont ReTREEt", city: "Hancock", state: "Vermont" },
    { name: "The Birch Perch! Treehouse with spa and fire pit!", city: "Warren", state: "Vermont" },
    { name: "Treehouse at Bliss Ridge Farm - Best Views in VT!", city: "Moretown", state: "Vermont" },
    { name: "Riverbed Treehouse @hot tub & a new sauna & views!", city: "Londonderry", state: "Vermont" },
    { name: "The Roost - Recharge & Relax", city: "Waterbury", state: "Vermont" },
    { name: "Kloki - River Lovers Treehouse  - sauna & hot tub!", city: "Londonderry", state: "Vermont" },
  ],
  "Vermont-a-frame": [
    { name: "A-Frame by the Brook", city: "Lyndon", state: "Vermont" },
    { name: "Tiny A-Frame Rest House in Woods near Ski Resorts", city: "Chester", state: "Vermont" },
    { name: "Designer A-Frame Treehouse | Hot Tub & Sauna", city: "Johnson", state: "Vermont" },
    { name: "Cozy a-frame w loft, new kitchen + mins to hiking", city: "Weathersfield", state: "Vermont" },
    { name: "The Mountain A-Frame at Mount Snow", city: "Dover", state: "Vermont" },
    { name: "The Darling A-frame", city: "Lyndon", state: "Vermont" },
    { name: "A-Frame | Hot Tub|  Dog Friendly | Near Mt. Snow", city: "Wilmington", state: "Vermont" },
    { name: "The Woodland A-Frame", city: "Jamaica", state: "Vermont" },
    { name: "The Chal-A-Frame Vermont", city: "Stratton", state: "Vermont" },
    { name: "Stylish AFrame ~ 5 min to Okemo ~ 15 to Killington", city: "Ludlow", state: "Vermont" },
    { name: "A-Frame Resto-Mod: Built in '73, Restored in '23", city: "Waitsfield", state: "Vermont" },
    { name: "Green Mountain Yay Frame", city: "Killington", state: "Vermont" },
    { name: "Dog Friendly A-Frame Retreat near Hiking, Skiing", city: "Winhall", state: "Vermont" },
    { name: "Wilmington A-Frame-  Cozy and Convenient", city: "Wilmington", state: "Vermont" },
  ],
};

const SESSION_COOKIE = "bev=1742953792_EAYjk2MjU4ZTMwZD; jitney_client_session_id=ce23639b-27af-444a-9a03-0c7d08e56757";

// ─── Fetch listing ID by searching Airbnb for the listing name ────────────
async function fetchListingBySearch(name, state) {
  const stateSlug = state.replace(/\s+/g, "-");
  const url = `https://www.airbnb.com/s/${stateSlug}/homes?raw_text_query=${encodeURIComponent(name)}&refinement_paths%5B%5D=%2Fhomes&search_type=autocomplete_click`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Cookie: SESSION_COOKIE,
      },
    });
    const html = await res.text();
    const match = html.match(/<script[^>]*data-deferred-state-0[^>]*>(.+?)<\/script>/s);
    if (!match) return null;
    const data = JSON.parse(match[1]);
    const staysEntry = (data?.niobeClientData ?? []).find(([k]) => k?.startsWith("StaysSearch"));
    if (!staysEntry) return null;
    const results = staysEntry[1]?.data?.presentation?.staysSearch?.results?.searchResults ?? [];
    const first = results.find((r) => r?.demandStayListing?.id);
    if (!first) return null;
    const rawId = first.demandStayListing.id;
    // Decode base64 GraphQL ID
    try {
      const decoded = Buffer.from(rawId, "base64").toString("utf8");
      const numericId = decoded.split(":")[1] ?? rawId;
      return {
        id: numericId,
        imageUrl: first.contextualPictures?.[0]?.picture ?? null,
        rating: first.avgRatingLocalized ?? null,
        lat: first.demandStayListing?.location?.coordinate?.latitude ?? null,
        lng: first.demandStayListing?.location?.coordinate?.longitude ?? null,
        priceLabel: first.structuredDisplayPrice?.primaryLine?.price ?? null,
      };
    } catch { return null; }
  } catch (e) {
    console.error(`  Fetch error for "${name}": ${e.message}`);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────
const conn = await createConnection(process.env.DATABASE_URL);
let totalInserted = 0;
let totalSkipped = 0;

// Process combos with JSON files
for (const { state, keyword, region, jsonFile } of COMBOS) {
  const category = normalizeCategory(keyword);
  console.log(`\n📦 Seeding ${state} ${category} from ${jsonFile}...`);
  
  if (!existsSync(jsonFile)) {
    console.log(`  ⚠️  File not found: ${jsonFile}`);
    continue;
  }
  
  const raw = JSON.parse(readFileSync(jsonFile, "utf-8"));
  
  // Dedup by ID
  const seen = new Set();
  const unique = raw.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
  
  // Cap at MAX_PER_COMBO
  const capped = unique.slice(0, MAX_PER_COMBO);
  console.log(`  ${raw.length} raw → ${unique.length} unique → ${capped.length} capped`);
  
  for (const l of capped) {
    const airbnbId = String(l.id ?? "").trim();
    const title = String(l.name ?? "").trim().slice(0, 200);
    const city = String(l.city ?? "").trim().slice(0, 128);
    const imageUrl = l.imageUrl ?? null;
    const lat = l.lat ?? null;
    const lng = l.lng ?? null;
    const rating = parseRating(l.rating);
    const reviewCount = parseReviewCount(l.rating);
    const pricePerNight = parsePrice(l.priceLabel);
    const airbnbUrl = `https://www.airbnb.com/rooms/${airbnbId}`;
    
    if (!airbnbId || !title) { totalSkipped++; continue; }
    
    try {
      await conn.execute(
        `INSERT INTO listings
           (airbnbId, title, city, region, country, categories, imageUrl,
            latitude, longitude, rating, reviewCount, pricePerNight, airbnbUrl, active)
         VALUES (?, ?, ?, ?, 'US', ?, ?, ?, ?, ?, ?, ?, ?, 'yes')
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           city = VALUES(city),
           region = VALUES(region),
           categories = VALUES(categories),
           imageUrl = VALUES(imageUrl),
           latitude = VALUES(latitude),
           longitude = VALUES(longitude),
           rating = VALUES(rating),
           reviewCount = VALUES(reviewCount),
           pricePerNight = VALUES(pricePerNight),
           airbnbUrl = VALUES(airbnbUrl),
           active = 'yes'`,
        [airbnbId, title, city, region, category, imageUrl, lat, lng, rating, reviewCount, pricePerNight, airbnbUrl]
      );
      console.log(`  ✓ ${airbnbId} | ${title.slice(0, 55)}`);
      totalInserted++;
    } catch (err) {
      console.error(`  ✗ ${airbnbId} | ${err.message}`);
      totalSkipped++;
    }
  }
}

// Process manual listings (CO A-frame, VT treehouse, VT A-frame)
const MANUAL_COMBOS = [
  { key: "Colorado-a-frame",   state: "Colorado", keyword: "a-frame",   region: "CO" },
  { key: "Vermont-treehouse",  state: "Vermont",  keyword: "treehouse", region: "VT" },
  { key: "Vermont-a-frame",    state: "Vermont",  keyword: "a-frame",   region: "VT" },
];

for (const { key, state, keyword, region } of MANUAL_COMBOS) {
  const category = normalizeCategory(keyword);
  const listings = MANUAL_LISTINGS[key] ?? [];
  const capped = listings.slice(0, MAX_PER_COMBO);
  console.log(`\n🔍 Fetching IDs for ${state} ${category} (${capped.length} listings)...`);
  
  let comboInserted = 0;
  for (const l of capped) {
    console.log(`  Searching: "${l.name.slice(0, 55)}"...`);
    const found = await fetchListingBySearch(l.name, state);
    
    if (!found) {
      console.log(`  ⚠️  Not found — skipping`);
      totalSkipped++;
      continue;
    }
    
    const airbnbId = String(found.id).trim();
    const title = String(l.name).trim().slice(0, 200);
    const city = String(l.city ?? "").trim().slice(0, 128);
    const imageUrl = found.imageUrl ?? null;
    const lat = found.lat ?? null;
    const lng = found.lng ?? null;
    const rating = parseRating(found.rating);
    const reviewCount = parseReviewCount(found.rating);
    const pricePerNight = parsePrice(found.priceLabel);
    const airbnbUrl = `https://www.airbnb.com/rooms/${airbnbId}`;
    
    if (!airbnbId || !title) { totalSkipped++; continue; }
    
    try {
      await conn.execute(
        `INSERT INTO listings
           (airbnbId, title, city, region, country, categories, imageUrl,
            latitude, longitude, rating, reviewCount, pricePerNight, airbnbUrl, active)
         VALUES (?, ?, ?, ?, 'US', ?, ?, ?, ?, ?, ?, ?, ?, 'yes')
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           city = VALUES(city),
           region = VALUES(region),
           categories = VALUES(categories),
           imageUrl = VALUES(imageUrl),
           latitude = VALUES(latitude),
           longitude = VALUES(longitude),
           rating = VALUES(rating),
           reviewCount = VALUES(reviewCount),
           pricePerNight = VALUES(pricePerNight),
           airbnbUrl = VALUES(airbnbUrl),
           active = 'yes'`,
        [airbnbId, title, city, region, category, imageUrl, lat, lng, rating, reviewCount, pricePerNight, airbnbUrl]
      );
      console.log(`  ✓ ${airbnbId} | ${title.slice(0, 55)}`);
      totalInserted++;
      comboInserted++;
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      totalSkipped++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log(`  → ${comboInserted} inserted for ${state} ${category}`);
}

await conn.end();
console.log(`\n✅ Done: ${totalInserted} inserted/updated, ${totalSkipped} skipped`);

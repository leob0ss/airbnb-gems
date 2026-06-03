/**
 * scrape-all-states.mjs
 * Overnight orchestrator: scrapes treehouses + a-frames for all 45 remaining US states.
 * Runs 3 scrapers in parallel at a time to avoid rate limiting.
 * Seeds results into DB as each batch completes.
 *
 * Already covered: California, Washington, Oregon, Colorado, Vermont
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { execSync, spawn } from "child_process";
import mysql from "mysql2/promise";

// ─── State priority order ─────────────────────────────────────────────────────
// Prioritized by expected treehouse/A-frame inventory based on Airbnb culture,
// outdoor tourism, and forest/mountain terrain.
const STATES = [
  // Tier 1: High-confidence high-inventory
  "Tennessee", "North Carolina", "New York", "Montana", "Texas",
  "Georgia", "Florida", "Arizona", "Michigan", "Wisconsin",
  // Tier 2: Strong outdoor/cabin markets
  "Minnesota", "Missouri", "Arkansas", "Virginia", "West Virginia",
  "Pennsylvania", "Maine", "New Hampshire", "Idaho", "Utah",
  // Tier 3: Moderate markets
  "New Mexico", "Hawaii", "South Carolina", "Kentucky", "Ohio",
  "Indiana", "Illinois", "Massachusetts", "Maryland", "Connecticut",
  // Tier 4: Lower expected inventory
  "Louisiana", "Mississippi", "Alabama", "Oklahoma", "Kansas",
  "Nebraska", "Iowa", "South Dakota", "North Dakota", "Wyoming",
  "Nevada", "Alaska", "New Jersey", "Delaware", "Rhode Island",
];

const KEYWORDS = ["treehouse", "a-frame"];
const PARALLEL = 3; // run 3 scrapers at a time
const LOG_FILE = "/tmp/scrape-all-states-master.log";

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  process.stdout.write(line + "\n");
  writeFileSync(LOG_FILE, line + "\n", { flag: "a" });
};

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function seedResults(state, keyword, listings) {
  if (!listings.length) return 0;
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  let inserted = 0;
  for (const l of listings) {
    if (!l.id) continue;
    try {
      let ratingFloat = null;
      if (l.rating) {
        const parsed = parseFloat(String(l.rating).replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) ratingFloat = parsed;
      }
      await db.execute(
        `INSERT INTO listings
          (airbnbId, title, city, region, categories, latitude, longitude, imageUrl, airbnbUrl, rating, signalSource, confidence, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'category_url', 85, 'yes')
         ON DUPLICATE KEY UPDATE
           title=VALUES(title), city=VALUES(city), region=VALUES(region),
           imageUrl=IF(VALUES(imageUrl) != '' AND VALUES(imageUrl) IS NOT NULL, VALUES(imageUrl), imageUrl),
           latitude=COALESCE(VALUES(latitude), latitude),
           longitude=COALESCE(VALUES(longitude), longitude),
           rating=COALESCE(VALUES(rating), rating)`,
        [
          l.id,
          l.name,
          l.city ?? null,
          state,
          JSON.stringify([keyword]),
          l.lat ?? null,
          l.lng ?? null,
          l.imageUrl ?? null,
          l.airbnbUrl ?? `https://www.airbnb.com/rooms/${l.id}`,
          ratingFloat,
        ]
      );
      inserted++;
    } catch (e) {
      log(`  DB error for ${l.name}: ${e.message}`);
    }
  }
  await db.end();
  return inserted;
}

// ─── Run one scraper ──────────────────────────────────────────────────────────
function runScraper(state, keyword) {
  return new Promise((resolve) => {
    const stateSlug = state.replace(/\s+/g, "-").toLowerCase();
    const kwSlug = keyword.replace(/[^a-z]/gi, "");
    const outLog = `/tmp/${stateSlug}-${kwSlug}-scrape.txt`;
    const outJson = `/tmp/${stateSlug}-${kwSlug}-highs.json`;

    // Clear old log
    writeFileSync(outLog, "", { flag: "w" });

    const child = spawn("node", [
      "data/scrape-state-generic.mjs",
      "--state", state,
      "--keyword", keyword,
      "--pages", "20",
      "--max-highs", "20",
      "--max-listings", "150",
    ], {
      cwd: "/home/ubuntu/airbnb-design-filter",
      env: process.env,
      stdio: ["ignore", "ignore", "ignore"],
    });

    child.on("close", async (code) => {
      let listings = [];
      if (existsSync(outJson)) {
        try { listings = JSON.parse(readFileSync(outJson, "utf8")); } catch {}
      }
      const highCount = listings.filter(l => l.id).length;
      log(`  ✅ Done: ${state} / ${keyword} → ${highCount} HIGHs`);
      const seeded = await seedResults(state, keyword, listings.slice(0, 20));
      log(`  💾 Seeded ${seeded} into DB: ${state} / ${keyword}`);
      resolve({ state, keyword, highCount, seeded });
    });

    child.on("error", (err) => {
      log(`  ❌ Scraper error for ${state}/${keyword}: ${err.message}`);
      resolve({ state, keyword, highCount: 0, seeded: 0 });
    });
  });
}

// ─── Batch runner ─────────────────────────────────────────────────────────────
async function runBatch(tasks) {
  const results = await Promise.all(tasks.map(({ state, keyword }) => runScraper(state, keyword)));
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
log(`\n🚀 Starting overnight scrape: ${STATES.length} states × ${KEYWORDS.length} keywords = ${STATES.length * KEYWORDS.length} jobs`);
log(`Running ${PARALLEL} scrapers in parallel\n`);

// Build all tasks: interleave keywords so we get treehouse+aframe for each state
const allTasks = [];
for (const state of STATES) {
  for (const keyword of KEYWORDS) {
    allTasks.push({ state, keyword });
  }
}

const summary = [];
for (let i = 0; i < allTasks.length; i += PARALLEL) {
  const batch = allTasks.slice(i, i + PARALLEL);
  log(`\n📦 Batch ${Math.floor(i / PARALLEL) + 1}/${Math.ceil(allTasks.length / PARALLEL)}: ${batch.map(t => `${t.state}/${t.keyword}`).join(", ")}`);
  const results = await runBatch(batch);
  summary.push(...results);
}

// ─── Final report ─────────────────────────────────────────────────────────────
log("\n\n═══════════════════════════════════════");
log("📊 FINAL SUMMARY");
log("═══════════════════════════════════════");

const byState = {};
for (const r of summary) {
  if (!byState[r.state]) byState[r.state] = {};
  byState[r.state][r.keyword] = r;
}

for (const state of STATES) {
  const th = byState[state]?.treehouse;
  const af = byState[state]?.["a-frame"];
  log(`  ${state}: treehouse=${th?.highCount ?? 0} (seeded ${th?.seeded ?? 0}), a-frame=${af?.highCount ?? 0} (seeded ${af?.seeded ?? 0})`);
}

writeFileSync("/tmp/scrape-all-states-summary.json", JSON.stringify(summary, null, 2));
log("\n✅ All done. Summary saved to /tmp/scrape-all-states-summary.json");

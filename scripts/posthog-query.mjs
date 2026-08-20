#!/usr/bin/env node
/**
 * Query PostHog via HogQL (read access).
 *
 * Requires in .env (never commit these):
 *   POSTHOG_PERSONAL_API_KEY=phx_...
 *   POSTHOG_PROJECT_ID=516038
 *   POSTHOG_API_HOST=https://us.posthog.com   # US Cloud
 *
 * Usage:
 *   node scripts/posthog-query.mjs "SELECT event, count() FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY count() DESC LIMIT 50"
 *   node scripts/posthog-query.mjs --persons
 *   node scripts/posthog-query.mjs --recent
 *   node scripts/posthog-query.mjs --person swift-otter-4821
 */
import "dotenv/config";

const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const API_HOST = (
  process.env.POSTHOG_API_HOST || "https://us.posthog.com"
).replace(/\/$/, "");

function usage() {
  console.error(`Usage:
  node scripts/posthog-query.mjs "<hogql>"
  node scripts/posthog-query.mjs --recent
  node scripts/posthog-query.mjs --persons
  node scripts/posthog-query.mjs --person <distinct_id>
`);
  process.exit(1);
}

async function runHogQL(sql, name = "cursor-agent-query") {
  if (!API_KEY || !PROJECT_ID) {
    console.error(
      "Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID in .env",
    );
    process.exit(1);
  }

  const res = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/query/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      query: { kind: "HogQLQuery", query: sql },
      name,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`PostHog error ${res.status}:`, JSON.stringify(body, null, 2));
    process.exit(1);
  }

  return body;
}

function printResult(body) {
  const columns = body.columns || [];
  const results = body.results || [];
  if (!columns.length) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }
  const rows = results.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
  console.log(JSON.stringify(rows, null, 2));
}

const arg = process.argv[2];
if (!arg) usage();

let sql;
let name;

if (arg === "--recent") {
  sql = `
    SELECT
      timestamp,
      event,
      distinct_id,
      properties.listing_title AS listing_title,
      properties.us_state AS us_state,
      properties.listing_url AS listing_url,
      properties.trigger AS trigger
    FROM events
    WHERE timestamp > now() - INTERVAL 7 DAY
      AND event NOT LIKE '$%'
    ORDER BY timestamp DESC
    LIMIT 100
  `;
  name = "recent_custom_events";
} else if (arg === "--persons") {
  sql = `
    SELECT
      id,
      distinct_id,
      properties.name AS name,
      properties.email AS email,
      created_at
    FROM persons
    ORDER BY created_at DESC
    LIMIT 50
  `;
  name = "recent_persons";
} else if (arg === "--person") {
  const distinctId = process.argv[3];
  if (!distinctId) usage();
  sql = `
    SELECT
      timestamp,
      event,
      properties.listing_title AS listing_title,
      properties.us_state AS us_state,
      properties.listing_url AS listing_url,
      properties.trigger AS trigger,
      properties.category AS category
    FROM events
    WHERE distinct_id = '${distinctId.replace(/'/g, "\\'")}'
      AND timestamp > now() - INTERVAL 30 DAY
    ORDER BY timestamp DESC
    LIMIT 200
  `;
  name = "person_event_stream";
} else {
  sql = arg;
  name = "ad_hoc_query";
}

const body = await runHogQL(sql, name);
printResult(body);

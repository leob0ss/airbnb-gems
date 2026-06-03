/**
 * scrape-state-generic.mjs
 * Generic state + keyword scraper using the authenticated session approach.
 * Usage: node scrape-state-generic.mjs --state Oregon --keyword treehouse
 *        node scrape-state-generic.mjs --state Colorado --keyword a-frame
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const STATE = getArg("--state") ?? "Oregon";
const KEYWORD = getArg("--keyword") ?? "treehouse";
const MAX_PAGES = parseInt(getArg("--pages") ?? "8");
const MAX_HIGHS = parseInt(getArg("--max-highs") ?? "20");
const MAX_LISTINGS_READ = parseInt(getArg("--max-listings") ?? "150");
const PLACE_ID = getArg("--place-id") ?? null;
const LOCATION_BB = getArg("--location-bb") ?? null;
const BASE_URL = getArg("--base-url") ?? null;
const DELAY_MS = 2000;

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL ?? "";
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY ?? "";
const SESSION_COOKIE =
  "everest_cookie=1708036709.YFi8JGtLnUjBPWCOscRP.1swd4sci_vB_c8NjrWhz8xu_1DLsosEyUNY9DvjauGo; bev=1742953792_EAYjk2MjU4ZTMwZD; hli=1; li=1; auth_jitney_session_id=25dbd0ed-abad-4941-a12f-b1cfdf5e68fd; _user_attributes=%7B%22id%22%3A72165128%2C%22curr%22%3A%22USD%22%2C%22id_str%22%3A%2272165128%22%2C%22is_admin%22%3Afalse%7D; country=US; cdn_exp_abd8871b54fcbadab=treatment; cdn_exp_478d58f97600a02ae=control; cdn_exp_ce31f30dad3dbf195=treatment; jitney_client_session_id=5488f2bb-04a5-43a0-95ca-b19d661bebf2; jitney_client_session_created_at=1774626957.592; datadome=IFhOdoWTGQC9oRfANbWoy5fi4Icob8Q9EPtocl0bzz~YSC5cmERJcvsb1Vmf9HhQpu~UReSTi6A4mDdT1dpt7Aae~~FY3m4wUzbBE6wF7pXCY8r4v1_CV7VXMPmSBdOMbIcl6s~N4fKUe2xB5YG8IG; bm_sv=E8F0F212AC509B98F60B1BF28D163615~YAAQjZTYF362RwSdAQAAN+cYMB9ckDXxyrxizJ1hc4GDYRO3fdYyQpLG3JWlyuzHMcDgeVCl1u5aDlIKkSxDchnr/QF4rIkpexjHf8U2bCPgsoKPKRZujsOrp1t06ixNtpMtHgME1J7N+Omg1mYuelDE1ON1iPpC6tFqn2+rbIyeJWdDvR+bAv1yNrKC6hI/piParQekB69CGLP435SPDdhhDw95aA8/Qe/Gcjc6hp9Mmdp1z+HXr4mMZux0oIN4xg==~1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stateSlug = STATE.replace(/\s+/g, "-");
const outFile = `/tmp/${stateSlug.toLowerCase()}-${KEYWORD.replace(/[^a-z]/gi, "")}-scrape.txt`;

// ─── URL builder ──────────────────────────────────────────────────────────────
function buildUrl(cursor = null) {
  let params;
  let base;
  if (BASE_URL) {
    // Use the user's exact URL as base — just override raw_text_query and cursor
    const parsed = new URL(BASE_URL);
    base = `${parsed.origin}${parsed.pathname}`;
    params = parsed.searchParams;
    params.set("raw_text_query", KEYWORD);
  } else {
    base = `https://www.airbnb.com/s/${stateSlug}/homes`;
    params = new URLSearchParams({
      raw_text_query: KEYWORD,
      "refinement_paths[]": "/homes",
      search_type: "autocomplete_click",
    });
    if (PLACE_ID) params.set("place_id", PLACE_ID);
    if (LOCATION_BB) params.set("location_bb", LOCATION_BB);
  }
  if (cursor) params.set("cursor", cursor);
  return `${base}?${params.toString()}`;
}

// ─── Decode base64 GraphQL ID → numeric room ID ───────────────────────────────
function decodeId(rawId) {
  try {
    const decoded = Buffer.from(rawId, "base64").toString("utf8");
    return decoded.split(":")[1] ?? rawId;
  } catch {
    return rawId;
  }
}

// ─── Extract city from "Cabin in Ashford" → "Ashford" ────────────────────────
function extractCity(title) {
  const m = (title ?? "").match(/\bin\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

// ─── Scrape one page ──────────────────────────────────────────────────────────
async function scrapePage(cursor) {
  const url = buildUrl(cursor);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Cookie: SESSION_COOKIE,
    },
  });
  const html = await res.text();

  const match = html.match(
    /<script[^>]*data-deferred-state-0[^>]*>(.+?)<\/script>/s,
  );
  if (!match) return { listings: [], nextCursor: null };

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return { listings: [], nextCursor: null };
  }

  const staysEntry = (data?.niobeClientData ?? []).find(([k]) =>
    k?.startsWith("StaysSearch"),
  );
  if (!staysEntry) return { listings: [], nextCursor: null };

  const staysResults =
    staysEntry[1]?.data?.presentation?.staysSearch?.results ?? {};
  const results = staysResults?.searchResults ?? [];
  const nextCursor = staysResults?.paginationInfo?.nextPageCursor ?? null;

  const listings = results
    .filter((r) => r?.demandStayListing?.id)
    .map((r) => {
      const dsl = r.demandStayListing;
      const id = decodeId(dsl.id);
      const coord = dsl.location?.coordinate ?? {};
      return {
        id,
        name:
          r.nameLocalized?.localizedStringWithTranslationPreference ??
          r.subtitle ??
          "",
        cardTitle: r.title ?? "",
        city: extractCity(r.title),
        state: STATE,
        lat: coord.latitude ?? null,
        lng: coord.longitude ?? null,
        imageUrl: r.contextualPictures?.[0]?.picture ?? "",
        airbnbUrl: `https://www.airbnb.com/rooms/${id}`,
        rating: r.avgRatingLocalized ?? null,
        priceLabel: r.structuredDisplayPrice?.primaryLine?.price ?? null,
      };
    })
    .filter((l) => l.id && l.name);

  return { listings, nextCursor };
}

// ─── LLM scoring ──────────────────────────────────────────────────────────────
async function fetchListingDetails(listingId) {
  try {
    const res = await fetch(`https://www.airbnb.com/rooms/${listingId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Cookie: SESSION_COOKIE,
      },
    });
    const html = await res.text();
    const descMatch = html.match(/"description"\s*:\s*"([^"]{40,500})"/);
    const description = descMatch
      ? descMatch[1].replace(/\\n/g, " ").replace(/\\"/g, '"')
      : "";
    const propTypeMatch = html.match(/"propertyType"\s*:\s*"([^"]+)"/);
    const propertyType = propTypeMatch ? propTypeMatch[1] : "";
    return { description, propertyType };
  } catch {
    return { description: "", propertyType: "" };
  }
}

async function scoreListing(listing) {
  const kw = KEYWORD.toLowerCase();
  // Fast-path 1: keyword appears verbatim in the listing name or Airbnb card title.
  // e.g. "Bigfoot's Glamping Treehouse" or "Treehouse in Woodstock" → HIGH
  if (listing.name.toLowerCase().includes(kw)) return "HIGH";
  if ((listing.cardTitle ?? "").toLowerCase().includes(kw)) return "HIGH";

  const { description, propertyType } = await fetchListingDetails(listing.id);

  // Fast-path 2: Airbnb's own propertyType field matches the keyword.
  // e.g. propertyType="Treehouse" for "Tree Top Studio" → HIGH
  if (propertyType.toLowerCase().includes(KEYWORD.toLowerCase())) return "HIGH";

  const prompt = `You are evaluating Airbnb listings to find genuine "${KEYWORD}" properties.

Listing name: "${listing.name}"
Airbnb property type: "${propertyType}"
City: ${listing.city ?? "unknown"}
Description snippet: "${description}"

Is this a genuine ${KEYWORD}? Respond with exactly one word: HIGH, MEDIUM, or LOW.
- HIGH: clearly is a ${KEYWORD} (name/description explicitly confirms it)
- MEDIUM: possibly a ${KEYWORD} but unclear (e.g. name says "tree house" as two words, or description strongly implies it)
- LOW: not a ${KEYWORD} (just a cabin/house near trees, or uses the word loosely)`;

  try {
    const res = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FORGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
      }),
    });
    const json = await res.json();
    const answer =
      json?.choices?.[0]?.message?.content?.trim().toUpperCase() ?? "LOW";
    return answer.startsWith("HIGH")
      ? "HIGH"
      : answer.startsWith("MEDIUM")
        ? "MEDIUM"
        : "LOW";
  } catch {
    return "LOW";
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const log = (msg) => {
  process.stdout.write(msg + "\n");
  writeFileSync(outFile, msg + "\n", { flag: "a" });
};

log(
  `\n🏠 Scraping ${KEYWORD} in ${STATE} (up to ${MAX_PAGES} pages, max ${MAX_HIGHS} HIGHs, max ${MAX_LISTINGS_READ} read)\n`,
);

const highListings = [];
let cursor = null;
let pageNum = 0;
let totalRead = 0;

for (let i = 0; i < MAX_PAGES; i++) {
  pageNum++;
  log(`📄 Page ${pageNum}...`);
  const { listings, nextCursor } = await scrapePage(cursor);

  if (listings.length === 0) {
    log("No listings found, stopping.");
    break;
  }

  let pageHighs = 0;
  for (const listing of listings) {
    if (totalRead >= MAX_LISTINGS_READ) {
      log(`🛑 Reached ${MAX_LISTINGS_READ} listings read — stopping.`);
      break;
    }
    totalRead++;
    await sleep(DELAY_MS);
    const score = await scoreListing(listing);
    log(
      `  ${score === "HIGH" ? "✅" : score === "MEDIUM" ? "🟡" : "❌"} [${score}] ${listing.name.slice(0, 55)} — ${listing.city ?? "?"}`,
    );
    if (score === "HIGH") {
      highListings.push(listing);
      pageHighs++;
    }
  }
  log(
    `  → ${pageHighs} HIGHs on page ${pageNum} (total: ${highListings.length})\n`,
  );

  if (totalRead >= MAX_LISTINGS_READ) {
    log(`🛑 Reached ${MAX_LISTINGS_READ} listings read — stopping.`);
    break;
  }
  if (highListings.length >= MAX_HIGHS) {
    log(`🎯 Reached ${MAX_HIGHS} HIGH listings — stopping early.`);
    break;
  }
  if (!nextCursor) {
    log("No more pages.");
    break;
  }
  cursor = nextCursor;
  await sleep(DELAY_MS);
}

log(`\n📊 Total HIGH listings: ${highListings.length}`);

// Save results
const outJson = `/tmp/${stateSlug.toLowerCase()}-${KEYWORD.replace(/[^a-z]/gi, "")}-highs.json`;
writeFileSync(outJson, JSON.stringify(highListings, null, 2));
log(`💾 Saved to ${outJson}`);

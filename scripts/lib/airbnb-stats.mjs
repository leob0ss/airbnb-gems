/**
 * Parse rating + review count from a public Airbnb listing page HTML.
 */
export function parseStatsFromHtml(html) {
  let reviewCount = null;
  let rating = null;

  const reviewCountMatch = html.match(/"reviewCount"\s*:\s*(\d+)/);
  const reviewsCountMatch = html.match(/"reviewsCount"\s*:\s*(\d+)/);
  if (reviewCountMatch) reviewCount = parseInt(reviewCountMatch[1], 10);
  else if (reviewsCountMatch) reviewCount = parseInt(reviewsCountMatch[1], 10);

  const guestRating = html.match(/"guestSatisfactionOverall"\s*:\s*([\d.]+)/);
  const starRating = html.match(/"starRating"\s*:\s*([\d.]+)/);
  const avgRating = html.match(/"avgRatingLocalized"\s*:\s*"([\d.]+)"/);
  const raw = guestRating?.[1] ?? starRating?.[1] ?? avgRating?.[1];
  if (raw) {
    const n = parseFloat(raw);
    if (!Number.isNaN(n)) rating = normalizeRating(n);
  }

  if (reviewCount != null && reviewCount <= 0) reviewCount = null;

  return { rating, reviewCount };
}

export function normalizeRating(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.]/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.min(5, Math.max(0, n));
}

export async function fetchListingStats(airbnbId, options = {}) {
  const delayMs = options.delayMs ?? 0;
  if (delayMs > 0) await sleep(delayMs);

  const res = await fetch(`https://www.airbnb.com/rooms/${airbnbId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return parseStatsFromHtml(await res.text());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

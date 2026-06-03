/**
 * Badge Extractor
 * ---------------
 * Parses Airbnb's niobeClientData JSON payload embedded in listing HTML
 * to extract LISTING_DESIGN_PUBLICATIONS and LISTING_NOTABLE_DESIGNER badges.
 *
 * Also runs regex-based text matching against listing descriptions to identify
 * press-featured homes that Airbnb never formally badged.
 */

export interface ExtractedBadge {
  badgeType:
    | "LISTING_DESIGN_PUBLICATIONS"
    | "LISTING_NOTABLE_DESIGNER"
    | "TEXT_MATCH"
    | "OTHER";
  label: string;
  value: string;
}

export interface ExtractedListingData {
  title: string;
  description: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  pricePerNight: number | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  badges: ExtractedBadge[];
  publications: string[];
  designers: string[];
  categories: string[];
  signalSource: "badge_publication" | "badge_designer" | "text_match";
  confidence: number;
}

// ---------------------------------------------------------------------------
// Known design publications — used for both badge parsing and text matching
// ---------------------------------------------------------------------------
export const DESIGN_PUBLICATIONS = [
  "Architectural Digest",
  "AD",
  "Dwell",
  "Dezeen",
  "The New York Times",
  "NYT",
  "Sunset Magazine",
  "Sunset",
  "House Beautiful",
  "Elle Decor",
  "Wallpaper",
  "Wallpaper*",
  "Remodelista",
  "Curbed",
  "Apartment Therapy",
  "Azure Magazine",
  "Azure",
  "Metropolis",
  "Interior Design",
  "Vogue Living",
  "Monocle",
  "Kinfolk",
  "Domino",
  "Better Homes and Gardens",
  "This Old House",
  "Houzz",
  "Gardenista",
  "The Guardian",
  "The Times",
  "Forbes",
  "Condé Nast Traveler",
  "Travel + Leisure",
  "Airbnb Magazine",
];

// Architectural category keywords for auto-tagging
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "A-frame": ["a-frame", "a frame", "aframe"],
  Treehouse: ["treehouse", "tree house", "tree-house"],
  Dome: ["dome", "geodesic"],
  Castle: ["castle", "chateau", "château"],
  Barn: ["barn", "farmhouse", "farmstead"],
  Cabin: ["cabin", "log cabin"],
  "Container Home": ["shipping container", "container home"],
  Windmill: ["windmill", "mill house"],
  Cave: ["cave", "cavern", "grotto"],
  Lighthouse: ["lighthouse", "light house"],
  "Tiny Home": ["tiny home", "tiny house", "micro home"],
  Villa: ["villa", "estate"],
  Loft: ["loft", "industrial loft"],
  "Mid-Century Modern": ["mid-century", "midcentury", "eichler"],
  Brutalist: ["brutalist", "brutalism", "concrete"],
};

// ---------------------------------------------------------------------------
// niobeClientData parser
// ---------------------------------------------------------------------------

/**
 * Extracts the niobeClientData JSON blob from raw Airbnb listing HTML.
 * Airbnb embeds this as a script tag: <script id="data-deferred-state">
 * or as window.__niobe_data__ = {...}
 */
function extractNiobeData(html: string): Record<string, unknown> | null {
  // Primary: <script id="data-deferred-state-0"> or similar
  const deferredMatch = html.match(
    /<script[^>]+id="data-deferred-state[^"]*"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (deferredMatch?.[1]) {
    try {
      return JSON.parse(deferredMatch[1]);
    } catch {
      // fall through
    }
  }

  // Fallback: niobeClientData embedded directly
  const niobeMatch = html.match(/niobeClientData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (niobeMatch?.[1]) {
    try {
      return JSON.parse(niobeMatch[1]);
    } catch {
      // fall through
    }
  }

  return null;
}

/**
 * Recursively walks a JSON structure looking for PdpHighlight objects
 * that contain the badge type keys we care about.
 *
 * Airbnb's actual structure (as of 2024/2025):
 * {
 *   __typename: "PdpHighlight",
 *   title: "Featured in",
 *   subtitle: null,
 *   subtitleHtml: { __typename: "Html", htmlText: "Dwell, October 2024" },
 *   type: "LISTING_DESIGN_PUBLICATIONS"
 * }
 */
function findBadges(obj: unknown, found: ExtractedBadge[] = []): ExtractedBadge[] {
  if (!obj || typeof obj !== "object") return found;

  if (Array.isArray(obj)) {
    obj.forEach((item) => findBadges(item, found));
    return found;
  }

  const record = obj as Record<string, unknown>;

  if (
    typeof record["type"] === "string" &&
    (record["type"] === "LISTING_DESIGN_PUBLICATIONS" ||
      record["type"] === "LISTING_NOTABLE_DESIGNER")
  ) {
    const badgeType = record["type"] as
      | "LISTING_DESIGN_PUBLICATIONS"
      | "LISTING_NOTABLE_DESIGNER";

    // Primary: subtitleHtml.htmlText (e.g. "Dwell, October 2024")
    const subtitleHtml = record["subtitleHtml"] as Record<string, unknown> | null | undefined;
    const subtitleHtmlText =
      subtitleHtml && typeof subtitleHtml === "object"
        ? (subtitleHtml["htmlText"] as string) || ""
        : "";

    // Fallback: subtitle field, then title field with em-dash splitting
    const subtitle = (record["subtitle"] as string) || "";
    const title = (record["title"] as string) || (record["headline"] as string) || "";

    // Sanity check helper: publication names are short, no HTML, no policy language
    const isLikelyPublication = (s: string) =>
      s.length < 80 &&
      !s.includes("<") &&
      !/service animal|traveling with|emotional support|booking|please reach|special event/i.test(s);

    // Prefer subtitleHtml.htmlText, then subtitle, then split title
    let value = "";
    if (subtitleHtmlText && isLikelyPublication(subtitleHtmlText)) {
      value = subtitleHtmlText.trim();
    } else if (subtitle && isLikelyPublication(subtitle)) {
      value = subtitle.trim();
    } else if (title) {
      const valueParts = title.split(/\s*[—–-]\s*/);
      const candidate = valueParts.length > 1 ? valueParts[valueParts.length - 1].trim() : title.trim();
      if (isLikelyPublication(candidate)) {
        value = candidate;
      }
    }

    const label = title || (badgeType === "LISTING_DESIGN_PUBLICATIONS" ? "Featured in" : "Designed by");

    if (value) {
      found.push({ badgeType, label, value });
    }
  }

  // Recurse into all values
  Object.values(record).forEach((v) => findBadges(v, found));
  return found;
}

/**
 * Extracts basic listing metadata from the niobe data structure.
 */
function extractMetadata(data: Record<string, unknown>): Partial<ExtractedListingData> {
  const meta: Partial<ExtractedListingData> = {};

  // Walk for title
  const titleMatch = JSON.stringify(data).match(/"name"\s*:\s*"([^"]{10,200})"/);
  if (titleMatch) meta.title = titleMatch[1];

  // Walk for description
  const descMatch = JSON.stringify(data).match(/"description"\s*:\s*"([^"]{20,})"/);
  if (descMatch) meta.description = descMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');

  // Walk for image
  const imgMatch = JSON.stringify(data).match(
    /"(https:\/\/a0\.muscache\.com\/[^"]+\.(?:jpg|jpeg|webp|png)[^"]*)"/
  );
  if (imgMatch) meta.imageUrl = imgMatch[1];

  // Walk for rating
  const ratingMatch = JSON.stringify(data).match(/"starRating"\s*:\s*([\d.]+)/);
  if (ratingMatch) meta.rating = parseFloat(ratingMatch[1]);

  // Walk for review count
  const reviewMatch = JSON.stringify(data).match(/"reviewsCount"\s*:\s*(\d+)/);
  if (reviewMatch) meta.reviewCount = parseInt(reviewMatch[1], 10);

  return meta;
}

// ---------------------------------------------------------------------------
// Text matching
// ---------------------------------------------------------------------------

/**
 * Builds a regex that matches a publication name as a whole-word/phrase,
 * avoiding false positives like "house beautiful" as an adjective.
 */
function buildPublicationRegex(pub: string): RegExp {
  // Escape special regex chars
  const escaped = pub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Require it to be preceded by "in", "by", "for", "featured in", "as seen in"
  // or followed by a comma/period/quote — this filters out casual mentions
  return new RegExp(
    `(?:featured\\s+in|as\\s+seen\\s+in|covered\\s+by|published\\s+in|written\\s+up\\s+in|appeared\\s+in|spotlighted\\s+in|highlighted\\s+in|\\bin\\s+)\\s*${escaped}|${escaped}\\s*(?:magazine|feature|article|spread|issue|cover)`,
    "i"
  );
}

/**
 * Runs text-matching against a listing description.
 * Returns matched publications with false-positive filtering.
 */
export function matchPublicationsInText(text: string): ExtractedBadge[] {
  const found: ExtractedBadge[] = [];
  const lowerText = text.toLowerCase();

  for (const pub of DESIGN_PUBLICATIONS) {
    const regex = buildPublicationRegex(pub);
    if (regex.test(text)) {
      // Additional false-positive guard: "house beautiful" as adjective
      if (
        pub.toLowerCase() === "house beautiful" &&
        /house\s+beautiful\s+(?:home|garden|kitchen|bathroom|bedroom)/i.test(text)
      ) {
        continue;
      }
      found.push({
        badgeType: "TEXT_MATCH",
        label: `Mentioned in ${pub}`,
        value: pub,
      });
    }
  }

  return found;
}

/**
 * Auto-tags a listing with architectural categories based on title + description.
 */
export function detectCategories(title: string, description: string): string[] {
  const combined = `${title} ${description}`.toLowerCase();
  const matched: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => combined.includes(kw))) {
      matched.push(category);
    }
  }

  return matched;
}

// ---------------------------------------------------------------------------
// Main extraction entry point
// ---------------------------------------------------------------------------

/**
 * Given raw HTML from an Airbnb listing page, extracts all editorial signals.
 */
export function extractListingData(html: string): Partial<ExtractedListingData> {
  const niobeData = extractNiobeData(html);

  let badges: ExtractedBadge[] = [];
  let meta: Partial<ExtractedListingData> = {};

  if (niobeData) {
    badges = findBadges(niobeData);
    meta = extractMetadata(niobeData);
  }

  // Text matching on description
  const description = meta.description || "";
  const textBadges = matchPublicationsInText(description);

  // Merge badges (deduplicate by value)
  const allBadges = [...badges];
  for (const tb of textBadges) {
    if (!allBadges.some((b) => b.value === tb.value)) {
      allBadges.push(tb);
    }
  }

  // Derive publications and designers lists
  const publications = allBadges
    .filter(
      (b) =>
        b.badgeType === "LISTING_DESIGN_PUBLICATIONS" || b.badgeType === "TEXT_MATCH"
    )
    .map((b) => b.value)
    .filter(Boolean);

  const designers = allBadges
    .filter((b) => b.badgeType === "LISTING_NOTABLE_DESIGNER")
    .map((b) => b.value)
    .filter(Boolean);

  // Auto-detect categories
  const title = meta.title || "";
  const categories = detectCategories(title, description);

  // Determine signal source and confidence
  const hasBadgePublication = badges.some(
    (b) => b.badgeType === "LISTING_DESIGN_PUBLICATIONS"
  );
  const hasBadgeDesigner = badges.some(
    (b) => b.badgeType === "LISTING_NOTABLE_DESIGNER"
  );

  let signalSource: "badge_publication" | "badge_designer" | "text_match" = "text_match";
  let confidence = 70;

  if (hasBadgePublication) {
    signalSource = "badge_publication";
    confidence = 95;
  } else if (hasBadgeDesigner) {
    signalSource = "badge_designer";
    confidence = 90;
  } else if (textBadges.length > 0) {
    signalSource = "text_match";
    confidence = 75;
  }

  return {
    ...meta,
    badges: allBadges,
    publications,
    designers,
    categories,
    signalSource,
    confidence,
  };
}

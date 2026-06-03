/**
 * Geographic Grid Scraper
 * -----------------------
 * Subdivides a target region into a grid of bounding boxes, queries the
 * Airbnb search API for each cell (up to 15 pages × 18 results = 270 listings),
 * deduplicates listing IDs, then scrapes individual listing pages to extract
 * badge data at a polite rate (~14 req/min).
 *
 * This module is designed to be run as a background job (server-side only).
 */

import axios from "axios";
import { extractListingData } from "./badgeExtractor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoundingBox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface GridCell extends BoundingBox {
  row: number;
  col: number;
}

export interface RawListingResult {
  airbnbId: string;
  title: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  pricePerNight: number | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ScraperOptions {
  region: BoundingBox;
  /** Number of grid divisions per axis (e.g. 5 → 25 cells) */
  gridDivisions?: number;
  /** Delay in ms between individual listing page fetches (default 4300 ≈ 14/min) */
  listingFetchDelayMs?: number;
  /** Max listing pages to fetch per grid cell (max 15) */
  maxPagesPerCell?: number;
  /** Callback invoked after each listing is processed */
  onListingProcessed?: (result: ProcessedListing) => Promise<void>;
  /** Callback for progress updates */
  onProgress?: (msg: string) => void;
}

export interface ProcessedListing extends RawListingResult {
  publications: string[];
  designers: string[];
  categories: string[];
  signalSource: "badge_publication" | "badge_designer" | "text_match";
  confidence: number;
  description: string;
  airbnbUrl: string;
  isCurated: boolean;
}

// ---------------------------------------------------------------------------
// Predefined regions
// ---------------------------------------------------------------------------

export const REGIONS: Record<string, BoundingBox> = {
  sonoma_county: {
    swLat: 38.1,
    swLng: -123.5,
    neLat: 38.85,
    neLng: -122.35,
  },
  napa_valley: {
    swLat: 38.2,
    swLng: -122.5,
    neLat: 38.85,
    neLng: -122.1,
  },
  hudson_valley: {
    swLat: 41.4,
    swLng: -74.4,
    neLat: 42.4,
    neLng: -73.5,
  },
};

// ---------------------------------------------------------------------------
// Grid subdivision
// ---------------------------------------------------------------------------

/**
 * Divides a bounding box into an n×n grid of smaller cells.
 */
export function subdivideGrid(region: BoundingBox, divisions: number): GridCell[] {
  const cells: GridCell[] = [];
  const latStep = (region.neLat - region.swLat) / divisions;
  const lngStep = (region.neLng - region.swLng) / divisions;

  for (let row = 0; row < divisions; row++) {
    for (let col = 0; col < divisions; col++) {
      cells.push({
        row,
        col,
        swLat: region.swLat + row * latStep,
        swLng: region.swLng + col * lngStep,
        neLat: region.swLat + (row + 1) * latStep,
        neLng: region.swLng + (col + 1) * lngStep,
      });
    }
  }

  return cells;
}

// ---------------------------------------------------------------------------
// Airbnb search API
// ---------------------------------------------------------------------------

const AIRBNB_SEARCH_URL = "https://www.airbnb.com/api/v3/ExploreSearch";

const SEARCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Airbnb-API-Key": "d306zoyjsyarp7ifhu67rjxn52tv0t20",
  Referer: "https://www.airbnb.com/",
};

/**
 * Fetches one page of search results for a given bounding box.
 * Returns raw listing stubs (ID + basic metadata).
 */
async function fetchSearchPage(
  cell: GridCell,
  cursor: string | null,
  pageIndex: number
): Promise<{ listings: RawListingResult[]; nextCursor: string | null }> {
  const params: Record<string, string | number | boolean> = {
    operationName: "ExploreSearch",
    locale: "en",
    currency: "USD",
    ne_lat: cell.neLat,
    ne_lng: cell.neLng,
    sw_lat: cell.swLat,
    sw_lng: cell.swLng,
    items_per_grid: 18,
    refinement_paths: "/homes",
    search_type: "AUTOSUGGEST",
    tab_id: "home_tab",
  };

  if (cursor) {
    params["cursor"] = cursor;
  } else {
    params["items_offset"] = pageIndex * 18;
  }

  try {
    const response = await axios.get(AIRBNB_SEARCH_URL, {
      params,
      headers: SEARCH_HEADERS,
      timeout: 15000,
    });

    const data = response.data;
    const sections =
      data?.data?.presentation?.explore?.sections?.sections ||
      data?.data?.dora?.exploreV3?.sections ||
      [];

    const rawListings: RawListingResult[] = [];
    let nextCursor: string | null = null;

    for (const section of sections) {
      const items = section?.items || section?.listings || [];
      for (const item of items) {
        const listing = item?.listing || item;
        if (!listing?.id) continue;

        rawListings.push({
          airbnbId: String(listing.id),
          title: listing.name || listing.title || "",
          imageUrl: listing.contextualPictures?.[0]?.picture || listing.picture || null,
          rating: listing.avgRatingLocalized
            ? parseFloat(listing.avgRatingLocalized)
            : listing.starRating || null,
          reviewCount: listing.reviewsCount || null,
          pricePerNight: listing.price?.rate?.amount || null,
          city: listing.city || listing.publicAddress || null,
          latitude: listing.lat || null,
          longitude: listing.lng || null,
        });
      }

      // Extract pagination cursor
      if (section?.paginationInfo?.nextCursor) {
        nextCursor = section.paginationInfo.nextCursor;
      }
    }

    return { listings: rawListings, nextCursor };
  } catch {
    return { listings: [], nextCursor: null };
  }
}

/**
 * Enumerates all listing IDs within a grid cell by paginating through
 * up to maxPages pages of search results.
 */
async function enumerateCellListings(
  cell: GridCell,
  maxPages: number,
  onProgress?: (msg: string) => void
): Promise<RawListingResult[]> {
  const allListings: RawListingResult[] = [];
  const seenIds = new Set<string>();
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const { listings, nextCursor } = await fetchSearchPage(cell, cursor, page);

    for (const l of listings) {
      if (!seenIds.has(l.airbnbId)) {
        seenIds.add(l.airbnbId);
        allListings.push(l);
      }
    }

    cursor = nextCursor;

    onProgress?.(
      `  Cell [${cell.row},${cell.col}] page ${page + 1}/${maxPages}: +${listings.length} listings (total ${allListings.length})`
    );

    if (!nextCursor && page > 0) break;

    // Polite delay between pages (500ms)
    await delay(500);
  }

  return allListings;
}

// ---------------------------------------------------------------------------
// Individual listing page scraper
// ---------------------------------------------------------------------------

const LISTING_PAGE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Fetches a single Airbnb listing page and extracts badge data.
 */
async function scrapeListingPage(
  airbnbId: string
): Promise<Partial<ReturnType<typeof extractListingData>>> {
  const url = `https://www.airbnb.com/rooms/${airbnbId}`;
  try {
    const response = await axios.get(url, {
      headers: LISTING_PAGE_HEADERS,
      timeout: 20000,
    });
    return extractListingData(response.data as string);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main scraper orchestrator
// ---------------------------------------------------------------------------

/**
 * Runs the full geographic grid scraping pipeline for a target region.
 *
 * 1. Subdivides the region into a grid of cells.
 * 2. For each cell, enumerates listing IDs via the search API.
 * 3. Deduplicates across all cells.
 * 4. Scrapes individual listing pages to extract badge data.
 * 5. Calls onListingProcessed for each curated listing found.
 */
export async function runGridScraper(options: ScraperOptions): Promise<{
  totalEnumerated: number;
  totalCurated: number;
  errors: string[];
}> {
  const {
    region,
    gridDivisions = 4,
    listingFetchDelayMs = 4300,
    maxPagesPerCell = 15,
    onListingProcessed,
    onProgress,
  } = options;

  const cells = subdivideGrid(region, gridDivisions);
  onProgress?.(`Starting grid scrape: ${cells.length} cells, ${gridDivisions}×${gridDivisions} grid`);

  // Phase 1: Enumerate all listing IDs across the grid
  const allListingMap = new Map<string, RawListingResult>();
  const errors: string[] = [];

  for (const cell of cells) {
    try {
      const cellListings = await enumerateCellListings(cell, maxPagesPerCell, onProgress);
      for (const l of cellListings) {
        if (!allListingMap.has(l.airbnbId)) {
          allListingMap.set(l.airbnbId, l);
        }
      }
      onProgress?.(
        `Cell [${cell.row},${cell.col}] complete. Running total: ${allListingMap.size} unique listings`
      );
    } catch (err) {
      const msg = `Error in cell [${cell.row},${cell.col}]: ${String(err)}`;
      errors.push(msg);
      onProgress?.(msg);
    }

    // Polite delay between cells (1s)
    await delay(1000);
  }

  const allListings = Array.from(allListingMap.values());
  onProgress?.(`\nPhase 1 complete. ${allListings.length} unique listings enumerated.`);
  onProgress?.(`Phase 2: Scraping individual listing pages for badge data...`);

  // Phase 2: Scrape individual pages for badge data
  let totalCurated = 0;

  for (let i = 0; i < allListings.length; i++) {
    const stub = allListings[i];
    onProgress?.(`[${i + 1}/${allListings.length}] Scraping listing ${stub.airbnbId}...`);

    try {
      const extracted = await scrapeListingPage(stub.airbnbId);

      const publications = extracted.publications || [];
      const designers = extracted.designers || [];
      const categories = extracted.categories || [];
      const isCurated = publications.length > 0 || designers.length > 0;

      const processed: ProcessedListing = {
        ...stub,
        // Override with richer data from listing page if available
        title: extracted.title || stub.title,
        imageUrl: extracted.imageUrl || stub.imageUrl,
        rating: extracted.rating ?? stub.rating,
        reviewCount: extracted.reviewCount ?? stub.reviewCount,
        pricePerNight: extracted.pricePerNight ?? stub.pricePerNight,
        city: stub.city,
        latitude: stub.latitude,
        longitude: stub.longitude,
        publications,
        designers,
        categories,
        description: extracted.description || "",
        signalSource: extracted.signalSource || "text_match",
        confidence: extracted.confidence || 70,
        airbnbUrl: `https://www.airbnb.com/rooms/${stub.airbnbId}`,
        isCurated,
      };

      if (isCurated) {
        totalCurated++;
        onProgress?.(
          `  ✓ CURATED: "${processed.title}" — ${publications.join(", ")} ${designers.join(", ")}`
        );
        await onListingProcessed?.(processed);
      }
    } catch (err) {
      const msg = `Error scraping listing ${stub.airbnbId}: ${String(err)}`;
      errors.push(msg);
    }

    // Polite rate limiting: ~14 requests/minute
    await delay(listingFetchDelayMs);
  }

  return {
    totalEnumerated: allListings.length,
    totalCurated,
    errors,
  };
}

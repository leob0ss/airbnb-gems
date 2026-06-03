export interface StaticListing {
  id: number;
  airbnbId: string;
  title: string;
  imageUrl: string | null;
  airbnbUrl: string;
  rating: number | null;
  reviewCount: number | null;
  pricePerNight: number | null;
  bedrooms: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  description: string | null;
  publications: string | null;
  designers: string | null;
  categories: string | null;
  signalSource: string;
  confidence: number | null;
}

export interface ListingFilters {
  category?: string;
  region?: string;
}

let cachedListings: StaticListing[] | null = null;
let loadPromise: Promise<StaticListing[]> | null = null;

export function loadListings(): Promise<StaticListing[]> {
  if (cachedListings) return Promise.resolve(cachedListings);
  if (loadPromise) return loadPromise;

  loadPromise = fetch("/listings.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
      return res.json() as Promise<StaticListing[]>;
    })
    .then((data) => {
      cachedListings = data;
      return data;
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

function matchesCategory(categories: string | null, category?: string): boolean {
  if (!category) return true;
  if (!categories) return false;
  return categories.toLowerCase().includes(category.toLowerCase());
}

function matchesRegion(region: string | null, filterRegion?: string): boolean {
  if (!filterRegion) return true;
  if (!region) return false;
  return region.toLowerCase().includes(filterRegion.toLowerCase());
}

export function filterListings(
  listings: StaticListing[],
  filters: ListingFilters
): StaticListing[] {
  return listings.filter(
    (listing) =>
      matchesCategory(listing.categories, filters.category) &&
      matchesRegion(listing.region, filters.region)
  );
}

export function paginateListings(
  listings: StaticListing[],
  page: number,
  limit: number
): StaticListing[] {
  const offset = (page - 1) * limit;
  return listings.slice(offset, offset + limit);
}

export function getAvailableRegions(listings: StaticListing[]): string[] {
  const regions = new Set<string>();
  for (const listing of listings) {
    if (listing.region) regions.add(listing.region);
  }
  return Array.from(regions).sort((a, b) => a.localeCompare(b));
}

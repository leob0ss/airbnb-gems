import {
  filterListings,
  getAvailableRegions,
  loadListings,
  paginateListings,
  type ListingFilters,
  type StaticListing,
} from "@/lib/listingsData";
import { useEffect, useMemo, useState } from "react";

export function useListings(filters: ListingFilters, page: number, limit: number) {
  const [allListings, setAllListings] = useState<StaticListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadListings()
      .then((data) => {
        if (!cancelled) setAllListings(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load listings");
          setAllListings([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredListings = useMemo(
    () => filterListings(allListings, filters),
    [allListings, filters.category, filters.region]
  );

  const listings = useMemo(
    () => paginateListings(filteredListings, page, limit),
    [filteredListings, page, limit]
  );

  const availableStates = useMemo(
    () => getAvailableRegions(filterListings(allListings, { category: filters.category })),
    [allListings, filters.category]
  );

  return {
    listings,
    filteredListings,
    total: filteredListings.length,
    availableStates,
    loading,
    error,
  };
}

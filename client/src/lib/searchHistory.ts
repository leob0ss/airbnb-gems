import { ALL_VIBES, vibeKey } from "./vibes";

const STORAGE_KEY = "ag_previous_searches";
const MAX_SEARCHES = 12;

export type PreviousSearch = {
  id: string;
  url: string;
  vibeKeys: string[];
  vibeLabels: string[];
  place: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
  priceMax?: number;
  createdAt: number;
};

export function labelsForVibeKeys(keys: string[]): string[] {
  return keys
    .map((key) => ALL_VIBES.find((v) => vibeKey(v) === key)?.label)
    .filter((label): label is string => Boolean(label));
}

export function loadPreviousSearches(): PreviousSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PreviousSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePreviousSearch(
  entry: Omit<PreviousSearch, "id" | "createdAt" | "vibeLabels">,
): PreviousSearch[] {
  const nextEntry: PreviousSearch = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    vibeLabels: labelsForVibeKeys(entry.vibeKeys),
    createdAt: Date.now(),
  };

  const existing = loadPreviousSearches().filter((s) => s.url !== nextEntry.url);
  const next = [nextEntry, ...existing].slice(0, MAX_SEARCHES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

export function summarizeSearch(search: PreviousSearch): string {
  const parts: string[] = [];
  if (search.place.trim()) parts.push(search.place.trim());
  if (search.checkin && search.checkout) {
    parts.push(`${search.checkin} → ${search.checkout}`);
  } else if (search.checkin) {
    parts.push(search.checkin);
  }
  if (search.guests) parts.push(`${search.guests} guests`);
  if (search.priceMax) parts.push(`≤ $${search.priceMax}/night`);
  return parts.join(" · ");
}

/** Most recent search inputs for prefilling the search form. */
export function getLastSearchInputs(
  searches: PreviousSearch[] = loadPreviousSearches(),
): Pick<PreviousSearch, "place" | "checkin" | "checkout" | "guests"> | null {
  const last = searches[0];
  if (!last) return null;
  return {
    place: last.place,
    checkin: last.checkin,
    checkout: last.checkout,
    guests: last.guests,
  };
}

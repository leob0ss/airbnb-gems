import { EXTRA_VIBES, type Vibe, vibeKey } from "./vibes";

/** Airbnb's default undated search night count for price filters. */
export const DEFAULT_PRICE_FILTER_NIGHTS = 5;

export type AirbnbSearchParams = {
  place?: string;
  checkin?: string; // YYYY-MM-DD
  checkout?: string;
  adults?: number;
  /** Max price per night (converted to stay total for Airbnb's URL). */
  priceMax?: number;
  selectedKeys: string[]; // vibeKey values
};

/** Nights used for Airbnb price_max (stay total = nightly × nights). */
export function priceFilterNights(
  checkin?: string,
  checkout?: string,
): number {
  if (checkin && checkout) {
    const start = Date.parse(checkin);
    const end = Date.parse(checkout);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      const nights = Math.round((end - start) / (24 * 60 * 60 * 1000));
      if (nights > 0) return nights;
    }
  }
  return DEFAULT_PRICE_FILTER_NIGHTS;
}

/** Build an Airbnb search URL with hidden category / amenity filters. */
export function buildAirbnbSearchUrl(params: AirbnbSearchParams): string {
  const qs = new URLSearchParams();
  qs.append("refinement_paths[]", "/homes");
  qs.set("search_mode", "regular_search");

  const place = params.place?.trim();
  if (place) qs.set("query", place);

  if (params.checkin) qs.set("checkin", params.checkin);
  if (params.checkout) qs.set("checkout", params.checkout);
  if (params.adults && params.adults > 0) {
    qs.set("adults", String(params.adults));
  }
  if (params.priceMax && params.priceMax > 0) {
    const nights = priceFilterNights(params.checkin, params.checkout);
    // Airbnb's price_max is a stay total, not a nightly rate.
    const totalMax = Math.round(params.priceMax * nights);
    qs.set("price_filter_input_type", "0");
    qs.set("price_filter_num_nights", String(nights));
    qs.set("price_max", String(totalMax));
  }

  const order: string[] = [];
  for (const key of params.selectedKeys) {
    if (key.startsWith("p:")) {
      qs.append("property_type_id[]", key.slice(2));
    } else if (key.startsWith("e:")) {
      const extra = EXTRA_VIBES.find((e) => vibeKey(e) === key);
      if (!extra) continue;
      if (extra.tag) {
        qs.append("kg_and_tags[]", extra.tag);
        order.push(`kg_and_tags:${extra.tag}`);
      }
      if (extra.amenity != null) {
        qs.append("amenities[]", String(extra.amenity));
        order.push(`amenities:${extra.amenity}`);
      }
    }
  }
  for (const o of order) qs.append("selected_filter_order[]", o);

  qs.set("disable_auto_translation", "true");
  return `https://www.airbnb.com/s/homes?${qs.toString()}`;
}

export type PlaceSuggestion = {
  name: string;
  full: string;
};

/** Nominatim place autocomplete (same approach as vibebnb). */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");

  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    display_name: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      region?: string;
      county?: string;
      country?: string;
    };
  }>;

  return data.map((e) => {
    const a = e.address ?? {};
    const local =
      a.city || a.town || a.village || a.state || a.region || a.county ||
      e.display_name.split(",")[0];
    const name =
      a.country && local !== a.country ? `${local}, ${a.country}` : local;
    return { name, full: e.display_name };
  });
}

export function toggleVibeKey(keys: Set<string>, vibe: Vibe): Set<string> {
  const next = new Set(keys);
  const k = vibeKey(vibe);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  return next;
}

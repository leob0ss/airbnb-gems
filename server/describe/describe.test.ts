import { describe, expect, it } from "vitest";
import { buildSearchUrl, type Interpretation } from "./describe";

const base: Interpretation = {
  place: "",
  checkin: "",
  checkout: "",
  flexibleLength: "none",
  flexibleMonths: [],
  adults: 0,
  children: 0,
  pets: false,
  priceMaxPerNight: 0,
  minBedrooms: 0,
  filters: [],
  unmatched: [],
  summary: "",
};

const params = (r: Partial<Interpretation>) =>
  new URL(buildSearchUrl({ ...base, ...r })).searchParams;

describe("buildSearchUrl", () => {
  it("maps a dated search with price, guests and filters", () => {
    const qs = params({
      place: "Asheville, NC",
      checkin: "2026-10-09",
      checkout: "2026-10-11",
      adults: 2,
      pets: true,
      priceMaxPerNight: 200,
      filters: ["cabin", "treehouse", "hot-tub"],
    });
    expect(qs.get("query")).toBe("Asheville, NC");
    expect(qs.get("checkin")).toBe("2026-10-09");
    expect(qs.get("adults")).toBe("2");
    expect(qs.get("pets")).toBe("1");
    expect(qs.get("price_max")).toBe("400");
    expect(qs.get("price_filter_num_nights")).toBe("2");
    expect(qs.getAll("property_type_id[]")).toEqual(["4", "6"]);
    expect(qs.getAll("amenities[]")).toEqual(["25"]);
    expect(qs.get("currency")).toBe("USD");
  });

  it("uses flexible dates when there are no exact dates", () => {
    const qs = params({
      flexibleLength: "weekend",
      flexibleMonths: ["may"],
      priceMaxPerNight: 150,
    });
    expect(qs.get("checkin")).toBeNull();
    expect(qs.get("date_picker_type")).toBe("flexible_dates");
    expect(qs.getAll("flexible_trip_lengths[]")).toEqual(["weekend_trip"]);
    expect(qs.getAll("flexible_trip_dates[]")).toEqual(["may"]);
    expect(qs.get("price_max")).toBe("300");
  });

  it("leaves out everything that wasn't asked for", () => {
    const qs = params({});
    expect([...qs.keys()]).toEqual(["refinement_paths[]", "search_mode", "currency"]);
  });
});

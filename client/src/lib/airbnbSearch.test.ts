import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICE_FILTER_NIGHTS,
  buildAirbnbSearchUrl,
  priceFilterNights,
} from "./airbnbSearch";

describe("priceFilterNights", () => {
  it("uses trip length when dates are set", () => {
    expect(priceFilterNights("2026-08-10", "2026-08-13")).toBe(3);
  });

  it("falls back to default when dates are missing", () => {
    expect(priceFilterNights()).toBe(DEFAULT_PRICE_FILTER_NIGHTS);
    expect(priceFilterNights("2026-08-10")).toBe(DEFAULT_PRICE_FILTER_NIGHTS);
  });
});

describe("buildAirbnbSearchUrl price max", () => {
  it("converts nightly max to stay total for dated searches", () => {
    const url = buildAirbnbSearchUrl({
      selectedKeys: [],
      checkin: "2026-08-10",
      checkout: "2026-08-13",
      priceMax: 200,
    });
    const qs = new URL(url).searchParams;
    expect(qs.get("price_max")).toBe("600");
    expect(qs.get("price_filter_num_nights")).toBe("3");
  });

  it("uses default nights when undated", () => {
    const url = buildAirbnbSearchUrl({
      selectedKeys: [],
      priceMax: 200,
    });
    const qs = new URL(url).searchParams;
    expect(qs.get("price_max")).toBe(String(200 * DEFAULT_PRICE_FILTER_NIGHTS));
    expect(qs.get("price_filter_num_nights")).toBe(
      String(DEFAULT_PRICE_FILTER_NIGHTS),
    );
  });
});

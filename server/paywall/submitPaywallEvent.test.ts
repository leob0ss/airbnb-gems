import { describe, expect, it } from "vitest";
import { parsePaywallInput } from "./submitPaywallEvent";

describe("parsePaywallInput", () => {
  it("accepts paywall_paid with visitor", () => {
    expect(parsePaywallInput({ event: "paywall_paid", visitorId: "abc" })).toEqual({
      event: "paywall_paid",
      visitorId: "abc",
    });
  });

  it("rejects unknown events", () => {
    expect(parsePaywallInput({ event: "purchase" })).toEqual({
      success: false,
      error: "Invalid event.",
    });
  });
});

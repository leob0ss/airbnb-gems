import { describe, expect, it } from "vitest";
import { parsePaywallInput } from "./submitPaywallEvent";

describe("parsePaywallInput", () => {
  it("accepts paywall_paid with session", () => {
    expect(parsePaywallInput({ event: "paywall_paid", sessionId: "abc" })).toEqual({
      event: "paywall_paid",
      sessionId: "abc",
    });
  });

  it("rejects unknown events", () => {
    expect(parsePaywallInput({ event: "purchase" })).toEqual({
      success: false,
      error: "Invalid event.",
    });
  });
});

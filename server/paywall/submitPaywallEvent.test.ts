import { describe, expect, it } from "vitest";
import { parsePaywallInput } from "./submitPaywallEvent";

describe("parsePaywallInput", () => {
  it("accepts unlock_click with session", () => {
    expect(parsePaywallInput({ event: "unlock_click", sessionId: "abc" })).toEqual({
      event: "unlock_click",
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

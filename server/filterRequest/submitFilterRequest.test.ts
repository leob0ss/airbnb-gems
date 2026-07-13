import { describe, expect, it } from "vitest";
import { parseFilterRequestInput } from "./submitFilterRequest";

describe("parseFilterRequestInput", () => {
  it("accepts request with optional email and visitor", () => {
    const result = parseFilterRequestInput({
      whatLookingFor: "Yurts in Colorado",
      email: "user@example.com",
      visitorId: "vis_abc",
    });
    expect(result).toEqual({
      whatLookingFor: "Yurts in Colorado",
      email: "user@example.com",
      visitorId: "vis_abc",
    });
  });

  it("accepts request without email or visitor", () => {
    const result = parseFilterRequestInput({ whatLookingFor: "Cave houses" });
    expect(result).toEqual({
      whatLookingFor: "Cave houses",
      email: null,
      visitorId: null,
    });
  });

  it("rejects empty whatLookingFor", () => {
    const result = parseFilterRequestInput({ whatLookingFor: "   " });
    expect(result).toEqual({
      success: false,
      error: "Please describe what you're looking for.",
    });
  });

  it("rejects invalid email", () => {
    const result = parseFilterRequestInput({
      whatLookingFor: "Floating homes",
      email: "not-an-email",
    });
    expect(result).toEqual({
      success: false,
      error: "Please enter a valid email address.",
    });
  });
});

import { describe, expect, it } from "vitest";
import { parseContactInput } from "./submitContact";

describe("parseContactInput", () => {
  it("accepts message with optional email", () => {
    const result = parseContactInput({
      message: "Hello there",
      email: "user@example.com",
    });
    expect(result).toEqual({
      message: "Hello there",
      email: "user@example.com",
    });
  });

  it("accepts message without email", () => {
    const result = parseContactInput({ message: "Just a note" });
    expect(result).toEqual({ message: "Just a note", email: null });
  });

  it("rejects empty message", () => {
    const result = parseContactInput({ message: "   " });
    expect(result).toEqual({ success: false, error: "Message is required." });
  });

  it("rejects invalid email", () => {
    const result = parseContactInput({ message: "Hi", email: "not-an-email" });
    expect(result).toEqual({
      success: false,
      error: "Please enter a valid email address.",
    });
  });
});

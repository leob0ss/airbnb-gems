import { describe, expect, it } from "vitest";
import { parseSurveyInput } from "./submitSurvey";

describe("parseSurveyInput", () => {
  it("accepts a yes answer with follow-up and context", () => {
    const result = parseSurveyInput({
      answer: "yes",
      followup: "I was looking for treehouses in New York",
      sessionId: "test-session-123",
      activeCategory: "Treehouse",
      activeState: "New York",
    });
    expect(result).toEqual({
      answer: "yes",
      followup: "I was looking for treehouses in New York",
      sessionId: "test-session-123",
      activeCategory: "Treehouse",
      activeState: "New York",
    });
  });

  it("accepts a no answer without follow-up", () => {
    const result = parseSurveyInput({
      answer: "no",
      followup: null,
      sessionId: "test-session-456",
      activeCategory: "A-Frame",
      activeState: null,
    });
    expect(result).toEqual({
      answer: "no",
      followup: null,
      sessionId: "test-session-456",
      activeCategory: "A-Frame",
      activeState: null,
    });
  });

  it("rejects an invalid answer", () => {
    const result = parseSurveyInput({ answer: "maybe" });
    expect(result).toEqual({ success: false, error: "Invalid answer." });
  });

  it("rejects a follow-up that exceeds 500 characters", () => {
    const result = parseSurveyInput({
      answer: "yes",
      followup: "x".repeat(501),
    });
    expect(result).toEqual({
      success: false,
      error: "Follow-up must be at most 500 characters.",
    });
  });
});

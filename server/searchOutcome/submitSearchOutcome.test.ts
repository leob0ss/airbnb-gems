import { describe, expect, it } from "vitest";
import { parseSearchOutcomeInput } from "./submitSearchOutcome";

describe("parseSearchOutcomeInput", () => {
  it("accepts yes without follow-up", () => {
    expect(
      parseSearchOutcomeInput({ answer: "yes", visitorId: "swift-otter-1" }),
    ).toEqual({
      answer: "yes",
      lookingFor: null,
      visitorId: "swift-otter-1",
    });
  });

  it("accepts no with lookingFor", () => {
    expect(
      parseSearchOutcomeInput({
        answer: "no",
        lookingFor: "  floating homes  ",
      }),
    ).toEqual({
      answer: "no",
      lookingFor: "floating homes",
      visitorId: null,
    });
  });

  it("rejects invalid answer", () => {
    expect(parseSearchOutcomeInput({ answer: "maybe" })).toEqual({
      success: false,
      error: "Invalid answer.",
    });
  });
});

/**
 * Tests for the surveys.submit tRPC procedure.
 * Verifies that the procedure accepts valid input and rejects invalid input.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the DB helper and notification so we don't hit real services
vi.mock("./db", () => ({
  recordSurveyResponse: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { recordSurveyResponse } from "./db";
import { notifyOwner } from "./_core/notification";

// Import the router under test
import { appRouter } from "./routers";

function makeCaller() {
  return appRouter.createCaller({
    user: null,
    req: {} as any,
    res: {} as any,
  });
}

describe("surveys.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a 'yes' answer with a follow-up", async () => {
    const caller = makeCaller();
    const result = await caller.surveys.submit({
      answer: "yes",
      followup: "I was looking for treehouses in New York",
      sessionId: "test-session-123",
      activeCategory: "Treehouse",
      activeState: "New York",
    });

    expect(result).toEqual({ success: true });
    expect(recordSurveyResponse).toHaveBeenCalledWith(
      "yes",
      "I was looking for treehouses in New York",
      "test-session-123",
      "Treehouse",
      "New York"
    );
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Yes"),
        content: expect.stringContaining("I was looking for treehouses in New York"),
      })
    );
  });

  it("accepts a 'no' answer without a follow-up", async () => {
    const caller = makeCaller();
    const result = await caller.surveys.submit({
      answer: "no",
      followup: null,
      sessionId: "test-session-456",
      activeCategory: "A-Frame",
      activeState: null,
    });

    expect(result).toEqual({ success: true });
    expect(recordSurveyResponse).toHaveBeenCalledWith(
      "no",
      null,
      "test-session-456",
      "A-Frame",
      null
    );
  });

  it("rejects an invalid answer value", async () => {
    const caller = makeCaller();
    await expect(
      caller.surveys.submit({
        answer: "maybe" as any,
        sessionId: null,
        activeCategory: null,
        activeState: null,
      })
    ).rejects.toThrow();
  });

  it("rejects a follow-up that exceeds 500 characters", async () => {
    const caller = makeCaller();
    await expect(
      caller.surveys.submit({
        answer: "yes",
        followup: "x".repeat(501),
        sessionId: null,
        activeCategory: null,
        activeState: null,
      })
    ).rejects.toThrow();
  });
});

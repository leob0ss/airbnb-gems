import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock DB and notification helpers
vi.mock("./db", () => ({
  recordFilterRequest: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { recordFilterRequest } from "./db";
import { notifyOwner } from "./_core/notification";
import { appRouter } from "./routers";

function makeCaller() {
  return appRouter.createCaller({
    user: null,
    req: {} as any,
    res: {} as any,
  });
}

describe("filterRequests.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves the request and notifies owner", async () => {
    const caller = makeCaller();
    const result = await caller.filterRequests.submit({
      whatLookingFor: "Yurts in Colorado",
      email: "user@example.com",
      sessionId: "sess_abc",
    });

    expect(result).toEqual({ success: true });
    expect(recordFilterRequest).toHaveBeenCalledWith(
      "Yurts in Colorado",
      "user@example.com",
      "sess_abc"
    );
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Yurts in Colorado"),
        content: expect.stringContaining("user@example.com"),
      })
    );
  });

  it("works without an email (optional field)", async () => {
    const caller = makeCaller();
    const result = await caller.filterRequests.submit({
      whatLookingFor: "Cave houses",
      email: null,
      sessionId: null,
    });

    expect(result).toEqual({ success: true });
    expect(recordFilterRequest).toHaveBeenCalledWith("Cave houses", null, null);
  });

  it("rejects an empty whatLookingFor", async () => {
    const caller = makeCaller();
    await expect(
      caller.filterRequests.submit({ whatLookingFor: "", sessionId: null })
    ).rejects.toThrow();
  });

  it("rejects an invalid email format", async () => {
    const caller = makeCaller();
    await expect(
      caller.filterRequests.submit({
        whatLookingFor: "Floating homes",
        email: "not-an-email",
        sessionId: null,
      })
    ).rejects.toThrow();
  });
});

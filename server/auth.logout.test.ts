import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "sample-user",
      email: "sample@example.com",
      name: "Sample User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  };
}

describe("auth.logout", () => {
  it("reports success", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

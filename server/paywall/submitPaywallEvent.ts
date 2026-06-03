import { insertPaywallEvent, isPaywallDbConfigured } from "./db.js";

export type PaywallEventResult =
  | { success: true; id: number }
  | { success: false; error: string };

const ALLOWED_EVENTS = new Set(["paywall_shown", "unlock_click", "dismiss"]);

export function parsePaywallInput(body: unknown): PaywallEventResult | { event: string; sessionId: string | null } {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Invalid request body." };
  }

  const { event, sessionId } = body as Record<string, unknown>;

  if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
    return { success: false, error: "Invalid event." };
  }

  let normalizedSessionId: string | null = null;
  if (sessionId != null && sessionId !== "") {
    if (typeof sessionId !== "string" || sessionId.length > 64) {
      return { success: false, error: "Invalid session." };
    }
    normalizedSessionId = sessionId;
  }

  return { event, sessionId: normalizedSessionId };
}

export async function submitPaywallEvent(body: unknown): Promise<PaywallEventResult> {
  const parsed = parsePaywallInput(body);
  if ("success" in parsed) return parsed;

  if (!isPaywallDbConfigured()) {
    return { success: true, id: 0 };
  }

  const id = await insertPaywallEvent(parsed.event, parsed.sessionId);
  return { success: true, id };
}

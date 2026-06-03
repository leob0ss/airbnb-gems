import { insertPaywallEvent, isPaywallDbConfigured } from "./db.js";
import { notifyOwner } from "../_core/notification.js";

export type PaywallEventResult =
  | { success: true; id: number }
  | { success: false; error: string };

const ALLOWED_EVENTS = new Set(["paywall_shown", "unlock_click", "dismiss"]);

const EVENT_NOTIFICATIONS: Record<
  string,
  { title: string; content: string }
> = {
  paywall_shown: {
    title: "Paywall: limit reached",
    content: "Someone hit the listing click limit and saw the paywall.",
  },
  unlock_click: {
    title: "Paywall: unlock clicked",
    content:
      "Someone clicked Unlock for $9.99 (preview — no real payment yet).",
  },
  dismiss: {
    title: "Paywall: dismissed",
    content: "Someone closed the paywall without unlocking.",
  },
};

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
    return {
      success: false,
      error: "Paywall tracking is not configured (missing POSTGRES_URL).",
    };
  }

  const id = await insertPaywallEvent(parsed.event, parsed.sessionId);

  const notification = EVENT_NOTIFICATIONS[parsed.event];
  if (notification) {
    const sessionLine = parsed.sessionId
      ? `\n\nSession: ${parsed.sessionId}`
      : "";
    await notifyOwner({
      title: notification.title,
      content: `${notification.content}${sessionLine}`,
    });
  }

  return { success: true, id };
}

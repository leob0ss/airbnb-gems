import { insertPaywallEvent, isPaywallDbConfigured } from "./db.js";
import { notifyOwner } from "../_core/notification.js";
import { formatPacificTimestamp } from "../_core/pacificTime.js";

export type PaywallEventResult =
  | { success: true; id: number }
  | { success: false; error: string };

const ALLOWED_EVENTS = new Set(["paywall_paid", "paywall_rejected"]);

const EVENT_NOTIFICATIONS: Record<
  string,
  { title: string; content: string }
> = {
  paywall_paid: {
    title: "Paywall: paid",
    content:
      "Someone clicked Unlock for $9.99 (preview — no real payment yet).",
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

  if (parsed.event === "paywall_paid") {
    const notification = EVENT_NOTIFICATIONS[parsed.event];
    const sessionLine = parsed.sessionId
      ? `\n\nSession: ${parsed.sessionId}`
      : "";
    await notifyOwner({
      title: notification.title,
      content: `${notification.content}\n\nTime: ${formatPacificTimestamp()}${sessionLine}`,
    });
  }

  return { success: true, id };
}

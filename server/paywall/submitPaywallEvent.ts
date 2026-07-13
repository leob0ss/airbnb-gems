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

export function parsePaywallInput(
  body: unknown
): PaywallEventResult | { event: string; visitorId: string | null } {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Invalid request body." };
  }

  const { event, visitorId } = body as Record<string, unknown>;

  if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
    return { success: false, error: "Invalid event." };
  }

  let normalizedVisitorId: string | null = null;
  if (visitorId != null && visitorId !== "") {
    if (typeof visitorId !== "string" || visitorId.length > 64) {
      return { success: false, error: "Invalid visitor." };
    }
    normalizedVisitorId = visitorId;
  }

  return { event, visitorId: normalizedVisitorId };
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

  const id = await insertPaywallEvent(parsed.event, parsed.visitorId);

  if (parsed.event === "paywall_paid") {
    const notification = EVENT_NOTIFICATIONS[parsed.event];
    const visitorLine = parsed.visitorId
      ? `\n\nVisitor: ${parsed.visitorId}`
      : "";
    await notifyOwner({
      title: notification.title,
      content: `${notification.content}\n\nTime: ${formatPacificTimestamp()}${visitorLine}`,
    });
  }

  return { success: true, id };
}

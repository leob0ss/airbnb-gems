import { ENV } from "./env.js";

type CaptureProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Fire-and-forget server capture so a PostHog outage never fails the request. */
export function captureServerEvent(
  event: string,
  distinctId: string | null | undefined,
  properties?: CaptureProperties,
): void {
  if (!ENV.posthogKey || !distinctId) return;

  const host = ENV.posthogHost.replace(/\/$/, "");
  void fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: ENV.posthogKey,
      event,
      distinct_id: distinctId,
      properties: {
        ...properties,
        $lib: "airbnb-gems-server",
      },
    }),
  }).catch((error) => {
    console.warn("[PostHog] capture failed:", error);
  });
}

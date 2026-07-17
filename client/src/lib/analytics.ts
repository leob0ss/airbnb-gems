import posthog from "posthog-js";
import { getVisitorId } from "./visitorId";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN as
  | string
  | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://us.i.posthog.com";

let initialized = false;

/** Init PostHog and identify with our durable visitor_id (no-op without env key). */
export function initAnalytics(): void {
  if (initialized || !POSTHOG_KEY) return;
  initialized = true;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  });

  posthog.identify(getVisitorId());
}

export function track(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export { posthog };

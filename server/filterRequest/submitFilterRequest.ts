import { insertFilterRequest, isFilterRequestDbConfigured } from "./db.js";
import { notifyOwner } from "../_core/notification.js";
import { captureServerEvent } from "../_core/posthog.js";

export interface FilterRequestSubmitInput {
  whatLookingFor: string;
  email?: string | null;
  visitorId?: string | null;
  /** When set, the owner email is a feature waitlist rather than a filter request. */
  feature?: string | null;
}

export type FilterRequestSubmitResult =
  | { success: true; id: number }
  | { success: false; error: string };

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseFilterRequestInput(
  body: unknown,
): FilterRequestSubmitResult | FilterRequestSubmitInput {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Invalid request body." };
  }

  const { whatLookingFor, email, visitorId, feature } = body as Record<
    string,
    unknown
  >;

  if (typeof whatLookingFor !== "string" || !whatLookingFor.trim()) {
    return {
      success: false,
      error: "Please describe what you're looking for.",
    };
  }

  if (whatLookingFor.trim().length > 1000) {
    return {
      success: false,
      error: "Description must be at most 1000 characters.",
    };
  }

  let normalizedEmail: string | null = null;
  if (email != null && email !== "") {
    if (typeof email !== "string" || !validateEmail(email.trim())) {
      return { success: false, error: "Please enter a valid email address." };
    }
    normalizedEmail = email.trim();
  }

  let normalizedVisitorId: string | null = null;
  if (visitorId != null && visitorId !== "") {
    if (typeof visitorId !== "string" || visitorId.length > 64) {
      return { success: false, error: "Invalid visitor." };
    }
    normalizedVisitorId = visitorId;
  }

  let normalizedFeature: string | null = null;
  if (feature != null && feature !== "") {
    if (typeof feature !== "string" || feature.trim().length > 80) {
      return { success: false, error: "Invalid feature." };
    }
    normalizedFeature = feature.trim();
  }

  return {
    whatLookingFor: whatLookingFor.trim(),
    email: normalizedEmail,
    visitorId: normalizedVisitorId,
    feature: normalizedFeature,
  };
}

export async function submitFilterRequest(
  body: unknown,
): Promise<FilterRequestSubmitResult> {
  const parsed = parseFilterRequestInput(body);
  if ("success" in parsed) return parsed;

  if (!isFilterRequestDbConfigured()) {
    return {
      success: false,
      error: "Filter request form is not configured (missing POSTGRES_URL).",
    };
  }

  const storedLookingFor = parsed.feature
    ? parsed.whatLookingFor === parsed.feature
      ? `Feature waitlist: ${parsed.feature}`
      : `Feature waitlist: ${parsed.feature} — ${parsed.whatLookingFor}`
    : parsed.whatLookingFor;

  const id = await insertFilterRequest(
    storedLookingFor,
    parsed.email ?? null,
    parsed.visitorId ?? null,
  );

  const emailLine = parsed.email ? `\nEmail: ${parsed.email}` : "";
  const visitorLine = parsed.visitorId
    ? `\nVisitor: ${parsed.visitorId}`
    : "";

  if (parsed.feature) {
    const detailLine =
      parsed.whatLookingFor !== parsed.feature
        ? `\nTheir search: "${parsed.whatLookingFor}"`
        : "";
    await notifyOwner({
      title: `Feature waitlist: ${parsed.feature}`,
      content: `Feature requested: ${parsed.feature}${detailLine}${emailLine}${visitorLine}`,
    });
  } else {
    await notifyOwner({
      title: `Filter Request: "${parsed.whatLookingFor.slice(0, 60)}"`,
      content: `Looking for: "${parsed.whatLookingFor}"${emailLine}${visitorLine}`,
    });
  }

  captureServerEvent(
    parsed.feature ? "feature_waitlist_saved" : "filter_request_saved",
    parsed.visitorId,
    {
      feature: parsed.feature ?? null,
      has_email: Boolean(parsed.email),
      has_detail: Boolean(
        parsed.feature && parsed.whatLookingFor !== parsed.feature,
      ),
      request: storedLookingFor,
      request_id: id,
    },
  );

  return { success: true, id };
}

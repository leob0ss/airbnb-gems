import { insertFilterRequest, isFilterRequestDbConfigured } from "./db.js";
import { notifyOwner } from "../_core/notification.js";

export interface FilterRequestSubmitInput {
  whatLookingFor: string;
  email?: string | null;
  sessionId?: string | null;
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

  const { whatLookingFor, email, sessionId } = body as Record<string, unknown>;

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

  let normalizedSessionId: string | null = null;
  if (sessionId != null && sessionId !== "") {
    if (typeof sessionId !== "string" || sessionId.length > 64) {
      return { success: false, error: "Invalid session." };
    }
    normalizedSessionId = sessionId;
  }

  return {
    whatLookingFor: whatLookingFor.trim(),
    email: normalizedEmail,
    sessionId: normalizedSessionId,
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

  const id = await insertFilterRequest(
    parsed.whatLookingFor,
    parsed.email ?? null,
    parsed.sessionId ?? null,
  );

  const emailLine = parsed.email ? `\n\nEmail: ${parsed.email}` : "";
  await notifyOwner({
    title: `Filter Request: "${parsed.whatLookingFor.slice(0, 60)}"`,
    content: `Looking for: "${parsed.whatLookingFor}"${emailLine}`,
  });

  return { success: true, id };
}

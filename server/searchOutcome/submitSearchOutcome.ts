import { notifyOwner } from "../_core/notification.js";

export type SearchOutcomeAnswer = "yes" | "still_looking" | "no";

export interface SearchOutcomeInput {
  answer: SearchOutcomeAnswer;
  lookingFor?: string | null;
  visitorId?: string | null;
}

export type SearchOutcomeResult =
  | { success: true }
  | { success: false; error: string };

const ANSWER_LABELS: Record<SearchOutcomeAnswer, string> = {
  yes: "Yes — found something exciting",
  still_looking: "Still looking",
  no: "No",
};

export function parseSearchOutcomeInput(
  body: unknown,
): SearchOutcomeResult | SearchOutcomeInput {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Invalid request body." };
  }

  const { answer, lookingFor, visitorId } = body as Record<string, unknown>;

  if (
    answer !== "yes" &&
    answer !== "still_looking" &&
    answer !== "no"
  ) {
    return { success: false, error: "Invalid answer." };
  }

  let normalizedLookingFor: string | null = null;
  if (lookingFor != null && lookingFor !== "") {
    if (typeof lookingFor !== "string") {
      return { success: false, error: "Invalid follow-up." };
    }
    if (lookingFor.trim().length > 500) {
      return {
        success: false,
        error: "Follow-up must be at most 500 characters.",
      };
    }
    normalizedLookingFor = lookingFor.trim();
  }

  let normalizedVisitorId: string | null = null;
  if (visitorId != null && visitorId !== "") {
    if (typeof visitorId !== "string" || visitorId.length > 64) {
      return { success: false, error: "Invalid visitor." };
    }
    normalizedVisitorId = visitorId;
  }

  return {
    answer,
    lookingFor: normalizedLookingFor,
    visitorId: normalizedVisitorId,
  };
}

export async function submitSearchOutcome(
  body: unknown,
): Promise<SearchOutcomeResult> {
  const parsed = parseSearchOutcomeInput(body);
  if ("success" in parsed) return parsed;

  const label = ANSWER_LABELS[parsed.answer];
  const lookingLine = parsed.lookingFor
    ? `\n\nLooking for: "${parsed.lookingFor}"`
    : "";
  const visitorLine = parsed.visitorId
    ? `\nVisitor: ${parsed.visitorId}`
    : "";

  await notifyOwner({
    title: `Search outcome: ${label}`,
    content: `Answer: ${label}${lookingLine}${visitorLine}`,
  });

  return { success: true };
}

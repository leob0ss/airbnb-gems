import { insertSurveyResponse, isSurveyDbConfigured } from "./db.js";
import { notifyOwner } from "../_core/notification.js";

export interface SurveySubmitInput {
  answer: "yes" | "no";
  followup?: string | null;
  sessionId?: string | null;
  activeCategory?: string | null;
  activeState?: string | null;
}

export type SurveySubmitResult =
  | { success: true; id: number }
  | { success: false; error: string };

export function parseSurveyInput(
  body: unknown,
): SurveySubmitResult | SurveySubmitInput {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Invalid request body." };
  }

  const { answer, followup, sessionId, activeCategory, activeState } =
    body as Record<string, unknown>;

  if (answer !== "yes" && answer !== "no") {
    return { success: false, error: "Invalid answer." };
  }

  let normalizedFollowup: string | null = null;
  if (followup != null && followup !== "") {
    if (typeof followup !== "string") {
      return { success: false, error: "Invalid follow-up." };
    }
    if (followup.trim().length > 500) {
      return {
        success: false,
        error: "Follow-up must be at most 500 characters.",
      };
    }
    normalizedFollowup = followup.trim();
  }

  let normalizedSessionId: string | null = null;
  if (sessionId != null && sessionId !== "") {
    if (typeof sessionId !== "string" || sessionId.length > 64) {
      return { success: false, error: "Invalid session." };
    }
    normalizedSessionId = sessionId;
  }

  let normalizedCategory: string | null = null;
  if (activeCategory != null && activeCategory !== "") {
    if (typeof activeCategory !== "string" || activeCategory.length > 64) {
      return { success: false, error: "Invalid category." };
    }
    normalizedCategory = activeCategory;
  }

  let normalizedState: string | null = null;
  if (activeState != null && activeState !== "") {
    if (typeof activeState !== "string" || activeState.length > 128) {
      return { success: false, error: "Invalid state." };
    }
    normalizedState = activeState;
  }

  return {
    answer,
    followup: normalizedFollowup,
    sessionId: normalizedSessionId,
    activeCategory: normalizedCategory,
    activeState: normalizedState,
  };
}

export async function submitSurvey(body: unknown): Promise<SurveySubmitResult> {
  const parsed = parseSurveyInput(body);
  if ("success" in parsed) return parsed;

  if (!isSurveyDbConfigured()) {
    return {
      success: false,
      error: "Survey is not configured (missing POSTGRES_URL).",
    };
  }

  const id = await insertSurveyResponse(
    parsed.answer,
    parsed.followup ?? null,
    parsed.sessionId ?? null,
    parsed.activeCategory ?? null,
    parsed.activeState ?? null,
  );

  const answerLabel = parsed.answer === "yes" ? "✅ Yes" : "❌ Not yet";
  const followupLine = parsed.followup
    ? `\n\nFollow-up: "${parsed.followup}"`
    : "";
  const contextLine = [
    parsed.activeCategory && `Category: ${parsed.activeCategory}`,
    parsed.activeState && `State: ${parsed.activeState}`,
  ]
    .filter(Boolean)
    .join(" · ");

  await notifyOwner({
    title: `PMF Survey: ${answerLabel}`,
    content: `Answer: ${answerLabel}${followupLine}${contextLine ? `\n\nContext: ${contextLine}` : ""}`,
  });

  return { success: true, id };
}

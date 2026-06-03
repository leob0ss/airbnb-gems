/**
 * SurveyBanner — PMF survey prompt shown after the user's 2nd Airbnb click.
 *
 * Flow:
 *   Step 1: "Did you find what you were looking for?" → Yes / Not yet / Dismiss
 *   Step 2: Optional free-text follow-up (Send or Skip)
 *   Step 3: Thank-you message, then auto-dismiss after 3s
 *
 * Submits once when the user finishes (Skip, Send, or dismiss from follow-up).
 */
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SurveyBannerProps {
  sessionId: string;
  activeCategory: string;
  activeState: string | null;
  onDismiss: () => void;
}

type Step = "question" | "followup" | "thanks";

export default function SurveyBanner({
  sessionId,
  activeCategory,
  activeState,
  onDismiss,
}: SurveyBannerProps) {
  const [step, setStep] = useState<Step>("question");
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const [followupText, setFollowupText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function postSurvey(followup: string | null) {
    if (!answer) return;

    const response = await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer,
        followup,
        sessionId,
        activeCategory,
        activeState,
      }),
    });
    const data = (await response.json()) as { success?: boolean; error?: string };
    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Survey submit failed");
    }
    setSubmitted(true);
  }

  async function finishSurvey(followup: string | null) {
    if (submitted) {
      setStep("thanks");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await postSurvey(followup);
      setStep("thanks");
    } catch {
      setSubmitError("Could not save your response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (step === "followup") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step]);

  useEffect(() => {
    if (step === "thanks") {
      const t = setTimeout(onDismiss, 3000);
      return () => clearTimeout(t);
    }
  }, [step, onDismiss]);

  function handleAnswer(a: "yes" | "no") {
    setAnswer(a);
    setStep("followup");
  }

  function handleDismiss() {
    if (step === "followup" && answer && !submitted) {
      setIsSubmitting(true);
      setSubmitError("");
      void postSurvey(null)
        .then(() => onDismiss())
        .catch(() => setSubmitError("Could not save your response. Please try again."))
        .finally(() => setIsSubmitting(false));
      return;
    }
    onDismiss();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void finishSurvey(followupText.trim() || null);
    if (e.key === "Escape") handleDismiss();
  }

  const followupPrompt =
    answer === "yes"
      ? "What were you searching for?"
      : "What were you looking for that you didn't find?";

  return (
    <div
      role="dialog"
      aria-label="Quick feedback"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
    >
      <div className="bg-foreground text-background rounded-2xl shadow-2xl px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold leading-snug">
            {step === "question" && "Did you find what you were looking for?"}
            {step === "followup" && followupPrompt}
            {step === "thanks" && "Thanks for the feedback! 🙏"}
          </p>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === "question" && (
          <div className="flex gap-2">
            <button
              onClick={() => handleAnswer("yes")}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-background text-foreground hover:bg-background/90 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => handleAnswer("no")}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-background/20 text-background hover:bg-background/30 transition-colors"
            >
              Not yet
            </button>
          </div>
        )}

        {step === "followup" && (
          <>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={followupText}
                onChange={(e) => setFollowupText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer…"
                maxLength={500}
                className="flex-1 bg-background/15 text-background placeholder:text-background/50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-background/40"
              />
              <button
                onClick={() => void finishSurvey(followupText.trim() || null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-background text-foreground hover:bg-background/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "…" : "Send"}
              </button>
            </div>
            <button
              onClick={() => void finishSurvey(null)}
              disabled={isSubmitting}
              className="text-xs text-background/50 hover:text-background/80 transition-colors text-left disabled:opacity-50"
            >
              Skip
            </button>
            {submitError && <p className="text-xs text-red-400">{submitError}</p>}
          </>
        )}

        {step === "thanks" && (
          <p className="text-xs text-background/60">
            Your response helps us improve the tool.
          </p>
        )}
      </div>
    </div>
  );
}

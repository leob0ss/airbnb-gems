/**
 * SurveyBanner — PMF survey prompt shown after the user's 2nd Airbnb click.
 *
 * Flow:
 *   Step 1: "Did you find what you were looking for?" → Yes / Not yet / Dismiss
 *            → Answer is submitted to DB immediately on button click
 *   Step 2: Contextual free-text follow-up (optional — user can skip)
 *            → If submitted, a second POST updates with the follow-up text
 *   Step 3: Thank-you message, then auto-dismiss after 3s
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
  const inputRef = useRef<HTMLInputElement>(null);

  async function postSurvey(payload: {
    answer: "yes" | "no";
    followup: string | null;
    sessionId: string;
    activeCategory: string;
    activeState: string | null;
  }) {
    const response = await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { success?: boolean };
    if (!response.ok || !data.success) {
      throw new Error("Survey submit failed");
    }
  }

  // Auto-focus the input when we reach the follow-up step
  useEffect(() => {
    if (step === "followup") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step]);

  // Auto-dismiss after showing thanks
  useEffect(() => {
    if (step === "thanks") {
      const t = setTimeout(onDismiss, 3000);
      return () => clearTimeout(t);
    }
  }, [step, onDismiss]);

  // Submit the answer immediately when Yes/Not yet is clicked
  async function handleAnswer(a: "yes" | "no") {
    setAnswer(a);
    void postSurvey({
      answer: a,
      followup: null,
      sessionId,
      activeCategory,
      activeState,
    }).catch(() => {});
    setStep("followup");
  }

  async function handleSubmitFollowup() {
    if (!followupText.trim()) {
      setStep("thanks");
      return;
    }
    setIsSubmitting(true);
    try {
      await postSurvey({
        answer: answer!,
        followup: followupText.trim(),
        sessionId,
        activeCategory,
        activeState,
      });
      setStep("thanks");
    } catch {
      setStep("thanks");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSkip() {
    setStep("thanks");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmitFollowup();
    if (e.key === "Escape") onDismiss();
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
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold leading-snug">
            {step === "question" && "Did you find what you were looking for?"}
            {step === "followup" && followupPrompt}
            {step === "thanks" && "Thanks for the feedback! 🙏"}
          </p>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Yes / Not yet buttons */}
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

        {/* Step 2: Optional free-text follow-up */}
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
                onClick={handleSubmitFollowup}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-background text-foreground hover:bg-background/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "…" : "Send"}
              </button>
            </div>
            <button
              onClick={handleSkip}
              className="text-xs text-background/50 hover:text-background/80 transition-colors text-left"
            >
              Skip
            </button>
          </>
        )}

        {/* Step 3: Thanks — auto-dismisses */}
        {step === "thanks" && (
          <p className="text-xs text-background/60">
            Your response helps us improve the tool.
          </p>
        )}
      </div>
    </div>
  );
}

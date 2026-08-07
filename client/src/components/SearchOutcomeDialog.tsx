/**
 * Lightweight post-search outcome prompt.
 * Shown after "Search on Airbnb" so returning users can tap an answer.
 * "No" asks a short follow-up: what were you looking for?
 */
import { track } from "@/lib/analytics";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type SearchOutcome = "yes" | "still_looking" | "no";

interface SearchOutcomeDialogProps {
  visitorId: string;
  onClose: () => void;
}

const OPTIONS: { value: SearchOutcome; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "still_looking", label: "Still looking" },
  { value: "no", label: "No" },
];

const EXIT_MS = 220;

export default function SearchOutcomeDialog({
  visitorId,
  onClose,
}: SearchOutcomeDialogProps) {
  const [step, setStep] = useState<"question" | "followup">("question");
  const [lookingFor, setLookingFor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  function animateOut(then: () => void) {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(then, EXIT_MS);
  }

  async function finish(answer: SearchOutcome, followup: string | null) {
    if (isSubmitting || exiting) return;
    setIsSubmitting(true);

    const trimmed = followup?.trim() || null;
    track("search_outcome", {
      answer,
      has_followup: Boolean(trimmed),
      looking_for: trimmed || undefined,
    });

    try {
      await fetch("/api/search-outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer,
          lookingFor: trimmed,
          visitorId,
        }),
      });
    } catch {
      /* email notify is best-effort; PostHog already recorded */
    }

    animateOut(onClose);
  }

  function handleAnswer(answer: SearchOutcome) {
    if (answer === "no") {
      setStep("followup");
      return;
    }
    void finish(answer, null);
  }

  function handleDismiss() {
    if (exiting || isSubmitting) return;
    if (step === "followup") {
      void finish("no", null);
      return;
    }
    track("search_outcome_dismissed");
    animateOut(onClose);
  }

  const open = entered && !exiting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss"
        disabled={isSubmitting || exiting}
        onClick={handleDismiss}
        className={[
          "absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ease-out",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-outcome-title"
        className={[
          "relative z-10 w-full max-w-md origin-center transition-[opacity,transform] duration-200 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.96] opacity-0",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 rounded-2xl bg-foreground px-5 py-5 text-background shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <p
              id="search-outcome-title"
              className="text-[15px] font-semibold leading-snug"
            >
              {step === "question"
                ? "Did you find a place you're excited about?"
                : "What were you looking for?"}
            </p>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close"
              disabled={isSubmitting || exiting}
              className="mt-0.5 flex-shrink-0 opacity-60 transition-opacity hover:opacity-100 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            key={step}
            className="animate-in fade-in duration-200 fill-mode-both"
          >
            {step === "question" && (
              <div className="flex flex-col gap-2 sm:flex-row">
                {OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleAnswer(opt.value)}
                    disabled={isSubmitting || exiting}
                    className="flex-1 rounded-xl bg-background py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90 disabled:opacity-50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {step === "followup" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lookingFor}
                  onChange={(e) => setLookingFor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void finish("no", lookingFor);
                    if (e.key === "Escape") handleDismiss();
                  }}
                  placeholder="Type your answer…"
                  maxLength={500}
                  disabled={isSubmitting || exiting}
                  className="flex-1 rounded-xl bg-background/15 px-3 py-2.5 text-sm text-background outline-none placeholder:text-background/50 focus:ring-2 focus:ring-background/40 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => void finish("no", lookingFor)}
                  disabled={
                    isSubmitting || exiting || !lookingFor.trim()
                  }
                  className="rounded-xl bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90 disabled:opacity-40"
                >
                  {isSubmitting ? "…" : "Send"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

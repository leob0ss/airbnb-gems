/**
 * Lightweight post-search outcome prompt.
 * Shown after "Search on Airbnb" so returning users can tap an answer.
 */
import { track } from "@/lib/analytics";
import { X } from "lucide-react";

export type SearchOutcome = "yes" | "still_looking" | "no";

interface SearchOutcomeDialogProps {
  onClose: () => void;
}

const OPTIONS: { value: SearchOutcome; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "still_looking", label: "Still looking" },
  { value: "no", label: "No" },
];

export default function SearchOutcomeDialog({
  onClose,
}: SearchOutcomeDialogProps) {
  function handleAnswer(answer: SearchOutcome) {
    track("search_outcome", { answer });
    onClose();
  }

  function handleDismiss() {
    track("search_outcome_dismissed");
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-labelledby="search-outcome-title"
      className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
    >
      <div className="flex flex-col gap-3 rounded-2xl bg-foreground px-5 py-4 text-background shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <p
            id="search-outcome-title"
            className="text-sm font-semibold leading-snug"
          >
            Did you find a place you&apos;re excited about?
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="mt-0.5 flex-shrink-0 opacity-60 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleAnswer(opt.value)}
              className="flex-1 rounded-xl bg-background py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

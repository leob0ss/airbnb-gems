import { Check, X } from "lucide-react";
import { useRef, useState } from "react";

interface PaywallModalProps {
  sessionId: string;
  onClose: () => void;
  onUnlock: () => void;
}

const BENEFITS = [
  {
    title: "Unlock 20+ filters",
    detail: "Cabin, cave, farm, boat... all original Airbnb filters",
  },
  {
    title: "2,000+ hand-picked stays",
    detail: "Curated unique places across the U.S.",
  },
  {
    title: "New stays added regularly",
    detail: "Fresh finds without digging through Airbnb",
  },
  {
    title: "Lifetime access",
    detail: "One payment — current and future listings forever",
  },
] as const;

export default function PaywallModal({
  sessionId,
  onClose,
  onUnlock,
}: PaywallModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const outcomeLogged = useRef(false);

  async function logOutcome(event: "paywall_paid" | "paywall_rejected") {
    if (outcomeLogged.current) return;
    outcomeLogged.current = true;

    try {
      await fetch("/api/paywall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, sessionId }),
      });
    } catch {
      // Fake paywall — still unlock locally if API fails
    }
  }

  function handleClose() {
    if (!unlocked) {
      void logOutcome("paywall_rejected");
    }
    onClose();
  }

  async function handleUnlock() {
    setIsSubmitting(true);
    try {
      await logOutcome("paywall_paid");
    } finally {
      setIsSubmitting(false);
      setUnlocked(true);
      onUnlock();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative bg-background rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {unlocked ? (
          <div className="p-8 pt-10">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF385C]/10">
              <Check className="h-6 w-6 text-[#FF385C]" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2 text-center">
              You're in — for this preview
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 text-center">
              Payments aren't live yet. We've noted your interest and unlocked
              the rest of the listings for this session.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              Keep browsing
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-b from-[#FFF0F3] to-background px-8 pt-8 pb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#FF385C] mb-3">
                Airbnb Gems
              </p>
              <h2 className="text-2xl font-bold text-foreground tracking-tight leading-snug mb-2">
                Unlock the full collection
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hand-scouted unique stays — so you skip the endless scroll and
                book a place worth remembering.
              </p>
            </div>

            <div className="px-8 pb-8">
              <ul className="space-y-3.5 mb-7">
                {BENEFITS.map((benefit) => (
                  <li key={benefit.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF385C]/10">
                      <Check
                        className="h-3 w-3 text-[#FF385C]"
                        strokeWidth={3}
                      />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        {benefit.title}
                      </span>
                      <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {benefit.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-center text-sm text-foreground mb-4">
                <span className="font-bold text-lg">$9.99</span>
                <span className="text-muted-foreground"> one-time</span>
              </p>

              <button
                onClick={handleUnlock}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-[#FF385C] hover:bg-[#E31C5F] disabled:opacity-50 transition-colors mb-2 shadow-sm shadow-[#FF385C]/25"
              >
                {isSubmitting ? "…" : "Unlock for $9.99"}
              </button>
              <button
                onClick={handleClose}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

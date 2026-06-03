import { X } from "lucide-react";
import { useState } from "react";

interface PaywallModalProps {
  sessionId: string;
  onClose: () => void;
  onUnlock: () => void;
}

export default function PaywallModal({
  sessionId,
  onClose,
  onUnlock,
}: PaywallModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  async function handleUnlock() {
    setIsSubmitting(true);
    try {
      await fetch("/api/paywall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "unlock_click", sessionId }),
      });
    } catch {
      // Fake paywall — still unlock locally if API fails
    } finally {
      setIsSubmitting(false);
      setUnlocked(true);
      onUnlock();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-background rounded-2xl shadow-2xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {unlocked ? (
          <>
            <h2 className="text-xl font-bold text-foreground mb-2">
              You're in — for this preview
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Payments aren't live yet. We've noted your interest and unlocked
              the rest of the listings for this session.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              Keep browsing
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Airbnb Gems
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Every day, I manually scout Airbnb for the most unique places to
              stay at so you don't have to. Unlock below to save lots of time
              and stay at a place that will create an incredible memory.
            </p>
            <p className="text-sm text-foreground font-medium mb-6">
              Unlock all listings for a{" "}
              <span className="font-bold">$9.99 one-time fee</span>. Includes
              current and all future listings. Forever.
            </p>
            <button
              onClick={handleUnlock}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#FF385C] hover:bg-[#E31C5F] disabled:opacity-50 transition-colors mb-3"
            >
              {isSubmitting ? "…" : "Unlock for $9.99"}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

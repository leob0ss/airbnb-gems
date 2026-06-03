/**
 * MissingFilterModal — shown when a user clicks "Missing your filter?"
 *
 * Asks:
 *   1. "What are you looking for?" (required, free text)
 *   2. "Email" (optional — clearly labelled as such)
 *
 * On submit: saves to DB via filterRequests.submit and notifies the owner.
 */
import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";
import { useRef, useState } from "react";

interface MissingFilterModalProps {
  sessionId: string;
  onClose: () => void;
}

type Step = "form" | "thanks";

export default function MissingFilterModal({
  sessionId,
  onClose,
}: MissingFilterModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [whatLookingFor, setWhatLookingFor] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submitRequest = trpc.filterRequests.submit.useMutation();

  function validateEmail(val: string) {
    if (!val) return ""; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
      ? ""
      : "Please enter a valid email address.";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!whatLookingFor.trim()) return;

    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }

    await submitRequest.mutateAsync({
      whatLookingFor: whatLookingFor.trim(),
      email: email.trim() || null,
      sessionId,
    });

    setStep("thanks");
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-foreground text-background rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-background/50 mb-1">
              Missing your filter?
            </p>
            <h2 className="text-lg font-semibold leading-snug">
              {step === "form"
                ? "Tell us what you're looking for"
                : "Thanks — we'll be in touch! 🙏"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* What are you looking for */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-background/80">
                What are you looking for?
              </label>
              <textarea
                ref={inputRef}
                value={whatLookingFor}
                onChange={(e) => setWhatLookingFor(e.target.value)}
                placeholder="e.g. Yurts in Colorado, cave houses, floating homes…"
                rows={3}
                maxLength={1000}
                required
                autoFocus
                className="bg-background/15 text-background placeholder:text-background/40 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-background/40 resize-none"
              />
            </div>

            {/* Email — optional */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-background/80 flex items-center gap-2">
                Email
                <span className="text-xs font-normal text-background/40">
                  optional — so we can follow up with you
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                placeholder="you@example.com"
                className="bg-background/15 text-background placeholder:text-background/40 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-background/40"
              />
              {emailError && (
                <p className="text-xs text-red-400">{emailError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!whatLookingFor.trim() || submitRequest.isPending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-background text-foreground hover:bg-background/90 disabled:opacity-40 transition-colors"
            >
              {submitRequest.isPending ? "Sending…" : "Send"}
            </button>
          </form>
        )}

        {step === "thanks" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-background/70 leading-relaxed">
              We've received your request. If you left your email, we'll reach
              out when we add support for what you're looking for.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-background text-foreground hover:bg-background/90 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

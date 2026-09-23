import { identifyVisitor, track } from "@/lib/analytics";
import { submitInBackground } from "@/lib/filterRequest";
import { HANDPICKED_STAYS } from "@/lib/handpicked";
import { openListingUrl } from "@/lib/openListingUrl";
import { getVisitorId } from "@/lib/visitorId";
import { ArrowRight, BadgeCheck, Gem, LayoutGrid, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type FindMode = "categories" | "describe" | "handpicked";

const EXAMPLE_PROMPTS = [
  "A place that feels like a Studio Ghibli film",
  "Romantic place with amazing view under $200.",
  "Dog-friendly cabin near hiking trails and a lake.",
  "A typical NYC loft — exposed brick, big windows, industrial but warm.",
];

const PROMPT_INTERVAL_MS = 3800;
/** Keep in sync with the exit animation duration below. */
const PROMPT_EXIT_MS = 300;

const MODES: { mode: FindMode; label: string; icon: typeof LayoutGrid }[] = [
  { mode: "categories", label: "Categories", icon: LayoutGrid },
  { mode: "describe", label: "Describe", icon: Sparkles },
  { mode: "handpicked", label: "Handpicked", icon: Gem },
];

type Pill = { x: number; width: number };

export function FindModeTabs({
  mode,
  onChange,
}: {
  mode: FindMode;
  onChange: (m: FindMode) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<FindMode, HTMLButtonElement>());
  const [pill, setPill] = useState<Pill | null>(null);
  const [live, setLive] = useState(false);

  const measure = useCallback(() => {
    const list = listRef.current;
    const tab = tabRefs.current.get(mode);
    if (!list || !tab) return;
    const listBox = list.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    setPill({
      x: tabBox.left - listBox.left - list.clientLeft,
      width: tabBox.width,
    });
  }, [mode]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    setLive(true);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Ways to find a stay"
      className="relative isolate mx-auto flex w-fit items-center gap-1 rounded-full border border-border p-1"
    >
      {pill && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-foreground motion-reduce:transition-none"
          style={{
            left: pill.x,
            width: pill.width,
            transitionProperty: live ? "left, width" : "none",
            transitionDuration: "420ms",
            transitionTimingFunction: "cubic-bezier(0.22, 1.2, 0.36, 1)",
          }}
        />
      )}
      {MODES.map(({ mode: m, label, icon: Icon }) => {
        const active = m === mode;
        return (
          <button
            key={m}
            ref={(el) => {
              if (el) tabRefs.current.set(m, el);
              else tabRefs.current.delete(m);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (m !== mode) {
                track("find_mode_changed", { from: mode, to: m });
              }
              onChange(m);
            }}
            className={[
              "relative z-10 flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-300 sm:px-4 sm:text-[14px]",
              active
                ? "text-background"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

const FEATURE_STARTED_ON = "September 20, 2026";

function FeatureInterestModal({
  feature,
  detail,
  onClose,
}: {
  feature: string;
  detail?: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const submitted = useRef(false);
  /** One owner email per dialog: either the email signup or this fallback. */
  const reported = useRef(false);

  const reportWithoutEmail = useCallback(() => {
    const query = detail?.trim();
    if (reported.current || submitted.current || !query) return;
    reported.current = true;
    void submitInBackground(
      { feature, whatLookingFor: query, visitorId: getVisitorId() },
      { silent: true },
    );
  }, [detail, feature]);

  useEffect(() => {
    track("feature_waitlist_shown", {
      feature,
      has_detail: Boolean(detail?.trim()),
      detail: detail?.trim() || undefined,
      detail_length: detail?.trim().length ?? 0,
    });
  }, [detail, feature]);

  useEffect(() => {
    window.addEventListener("pagehide", reportWithoutEmail);
    return () => window.removeEventListener("pagehide", reportWithoutEmail);
  }, [reportWithoutEmail]);

  function validateEmail(val: string) {
    if (!val.trim()) return "Please enter your email address.";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
      ? ""
      : "Please enter a valid email address.";
  }

  function handleClose() {
    if (!submitted.current) {
      track("feature_waitlist_dismissed", {
        feature,
        has_detail: Boolean(detail?.trim()),
      });
      reportWithoutEmail();
    }
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }

    const trimmedEmail = email.trim();
    submitted.current = true;
    reported.current = true;
    identifyVisitor({ email: trimmedEmail });
    track("feature_waitlist", {
      feature,
      has_detail: Boolean(detail?.trim()),
      detail: detail?.trim() || undefined,
      detail_length: detail?.trim().length ?? 0,
    });
    toast.success("You’re on the list. We’ll email you when it’s ready.");
    onClose();

    void submitInBackground({
      feature,
      whatLookingFor: detail?.trim() || feature,
      email: trimmedEmail,
      visitorId: getVisitorId(),
    }).then((error) => {
      if (error) track("feature_waitlist_failed", { feature, error });
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-5 rounded-2xl bg-foreground p-6 text-background shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-background/50">
              {FEATURE_STARTED_ON}
            </p>
            <h2 className="text-lg font-semibold leading-snug">
              Coming soon…
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="mt-1 flex-shrink-0 opacity-50 transition-opacity hover:opacity-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-background/70">
              We’re actively building this feature. If you want to be notified
              when it’s available, leave your email and we’ll let you know. No
              spam.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-background/80">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                className="rounded-xl bg-background/15 px-3 py-2.5 text-sm text-background outline-none placeholder:text-background/40 focus:ring-2 focus:ring-background/40"
              />
              {emailError && (
                <p className="text-xs text-red-400">{emailError}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={!email.trim()}
              className="w-full rounded-xl bg-background py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90 disabled:opacity-40"
            >
              Notify me
            </button>
          </form>
      </div>
    </div>
  );
}

export function DescribePreview() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const rotating = !query && !focused;

  useEffect(() => {
    if (!rotating) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const id = window.setInterval(() => setLeaving(true), PROMPT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [rotating]);

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => {
      setPromptIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length);
      setLeaving(false);
    }, PROMPT_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  function captureInterest() {
    const q = query.trim();
    track("describe_search_submitted", {
      has_query: Boolean(q),
      query: q || undefined,
      query_length: q.length,
    });
    setInterestOpen(true);
  }

  return (
    <section aria-label="Describe your stay" className="flex flex-col gap-5">
      <p className="text-[15px] text-muted-foreground">
        Use your own words to describe what you’re looking for
      </p>

      <form
        className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3.5 focus-within:border-foreground"
        onSubmit={(e) => {
          e.preventDefault();
          captureInterest();
        }}
      >
        <Sparkles
          className="h-[18px] w-[18px] shrink-0 text-muted-foreground"
          strokeWidth={2}
        />
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {rotating && (
            <span
              key={promptIndex}
              aria-hidden="true"
              className={[
                "pointer-events-none absolute inset-0 truncate text-[16px] text-muted-foreground/60",
                leaving
                  ? "animate-out fade-out slide-out-to-top-3 fill-mode-forwards duration-300"
                  : "animate-in fade-in slide-in-from-bottom-3 duration-300",
              ].join(" ")}
            >
              {EXAMPLE_PROMPTS[promptIndex]}
            </span>
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              focused && !query ? EXAMPLE_PROMPTS[promptIndex] : undefined
            }
            aria-label="Describe the stay you want"
            className="relative w-full bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          type="submit"
          aria-label="Search"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF385C] text-white transition-colors hover:bg-[#E31C5F]"
        >
          <ArrowRight className="h-[18px] w-[18px]" strokeWidth={3} />
        </button>
      </form>

      {interestOpen && (
        <FeatureInterestModal
          feature="Describe"
          detail={query}
          onClose={() => setInterestOpen(false)}
        />
      )}
    </section>
  );
}

export function HandpickedPreview() {
  const [interestOpen, setInterestOpen] = useState(false);

  function captureInterest() {
    track("handpicked_show_more_clicked", {
      listing_count: HANDPICKED_STAYS.length,
    });
    setInterestOpen(true);
  }

  return (
    <section aria-label="Handpicked stays" className="flex flex-col gap-5">
      <div>
        <h2
          className="text-[22px] leading-tight text-foreground"
          style={{ fontFamily: '"Playfair Display", serif' }}
        >
          The shortlist
        </h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          A small set of stays we have picked by hand, held to our highest bar.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {["Genuinely one of a kind", "Loved by guests", "Vetted by us"].map(
          (criterion) => (
            <span
              key={criterion}
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground"
            >
              <BadgeCheck className="h-4 w-4 text-foreground" strokeWidth={2} />
              {criterion}
            </span>
          ),
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6">
        {HANDPICKED_STAYS.map((stay) => (
          <article
            key={stay.id}
            className="listing-card group cursor-pointer"
            onClick={() => {
              track("handpicked_listing_opened", {
                listing_id: stay.id,
                title: stay.title,
                location: stay.location,
              });
              openListingUrl(stay.airbnbUrl);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                track("handpicked_listing_opened", {
                  listing_id: stay.id,
                  title: stay.title,
                  location: stay.location,
                });
                openListingUrl(stay.airbnbUrl);
              }
            }}
            role="link"
            tabIndex={0}
            aria-label={`View ${stay.title} on Airbnb`}
          >
            <div
              className="card-image relative overflow-hidden rounded-xl bg-muted"
              style={{ aspectRatio: "20/19" }}
            >
              <img
                src={stay.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="mt-3">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {stay.title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                {stay.location}
              </p>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={captureInterest}
        className="h-12 rounded-lg border border-foreground text-[16px] font-medium text-foreground transition-colors hover:bg-secondary"
      >
        Show more
      </button>

      {interestOpen && (
        <FeatureInterestModal
          feature="More handpicked stays"
          onClose={() => setInterestOpen(false)}
        />
      )}
    </section>
  );
}

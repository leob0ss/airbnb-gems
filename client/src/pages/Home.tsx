import MissingFilterModal from "@/components/MissingFilterModal";
import {
  buildAirbnbSearchUrl,
  searchPlaces,
  toggleVibeKey,
  type PlaceSuggestion,
} from "@/lib/airbnbSearch";
import { track } from "@/lib/analytics";
import {
  loadPreviousSearches,
  savePreviousSearch,
  summarizeSearch,
  type PreviousSearch,
} from "@/lib/searchHistory";
import { getVisitorId } from "@/lib/visitorId";
import { ALL_VIBES, vibeKey } from "@/lib/vibes";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  Clock,
  MapPin,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

const PENDING_RESET_KEY = "ag_pending_search_reset";

type Step = "vibe" | "search";

function BrandMark({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 28 28"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <polygon
          points="14,2 24,7.5 24,20.5 14,26 4,20.5 4,7.5"
          fill="#FF385C"
        />
        <polygon
          points="14,7 20,10.5 20,17.5 14,21 8,17.5 8,10.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          opacity="0.6"
        />
      </svg>
      <span className="text-[28px] font-semibold tracking-tight text-[#222]">
        Airbnb <span className="text-[#FF385C]">Gems</span>
      </span>
    </div>
  );
}

function VibeTile({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "group flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-colors duration-200 sm:p-3",
        active
          ? "border-[#222] bg-[#F7F7F7]"
          : "border-[#EBEBEB] hover:border-[#DDDDDD]",
      ].join(" ")}
    >
      <img
        src={icon}
        alt=""
        width={64}
        height={64}
        className="h-12 w-12 object-contain sm:h-14 sm:w-14"
        draggable={false}
      />
      <span className="text-center text-[12px] leading-tight text-[#717171] sm:text-[13px]">
        {label}
      </span>
    </button>
  );
}

function PlaceInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pickedRef = useRef(false);

  useEffect(() => {
    if (pickedRef.current) {
      pickedRef.current = false;
      return;
    }
    const q = value.trim();
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await searchPlaces(q, ctrl.signal);
        setSuggestions(results);
        setOpen(true);
      } catch {
        /* aborted / network */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder="Anywhere"
        autoComplete="off"
        className="w-full rounded-xl border border-[#DDDDDD] bg-white px-4 py-3.5 text-[16px] text-[#222] outline-none transition-colors placeholder:text-[#B0B0B0] focus:border-[#222]"
      />
      {open && (suggestions.length > 0 || loading) && (
        <ul className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-[#DDDDDD] bg-white py-2 shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          {loading && suggestions.length === 0 && (
            <li className="px-4 py-3 text-[14px] text-[#B0B0B0]">
              Searching…
            </li>
          )}
          {suggestions.map((s) => (
            <li key={s.full}>
              <button
                type="button"
                title={s.full}
                onClick={() => {
                  pickedRef.current = true;
                  onChange(s.name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#F7F7F7]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EBEBEB]">
                  <MapPin className="h-4 w-4 text-[#222]" />
                </span>
                <span className="truncate text-[14px] text-[#222]">
                  {s.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WhenPicker({
  range,
  onChange,
}: {
  range: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = useMemo(() => {
    if (range?.from && range?.to) {
      return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
    }
    if (range?.from) return format(range.from, "MMM d");
    return "Anytime";
  }, [range]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-[#DDDDDD] bg-white px-4 py-3.5 text-left transition-colors hover:border-[#222]"
      >
        <span
          className={`text-[16px] ${range?.from ? "text-[#222]" : "text-[#B0B0B0]"}`}
        >
          {label}
        </span>
        <ChevronDown
          className={`h-[18px] w-[18px] text-[#717171] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-[#DDDDDD] bg-white p-3 shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={onChange}
            numberOfMonths={1}
            disabled={{ before: new Date() }}
            className="mx-auto"
          />
          <div className="mt-2 flex justify-between px-1">
            <button
              type="button"
              className="text-[13px] text-[#717171] hover:text-[#222]"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="text-[13px] font-medium text-[#FF385C]"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("vibe");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [place, setPlace] = useState("");
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [previousSearches, setPreviousSearches] = useState<PreviousSearch[]>(
    [],
  );
  const [showCategoryRequest, setShowCategoryRequest] = useState(false);
  const visitorId = useMemo(() => getVisitorId(), []);

  const selectedCount = selected.size;
  const canContinue = selectedCount > 0;

  const searchUrl = useMemo(() => {
    const checkin = range?.from
      ? format(range.from, "yyyy-MM-dd")
      : undefined;
    const checkout = range?.to ? format(range.to, "yyyy-MM-dd") : undefined;
    const adults = guests ? Number(guests) : undefined;
    const max = priceMax ? Number(priceMax) : undefined;
    return buildAirbnbSearchUrl({
      place,
      checkin,
      checkout,
      adults: Number.isFinite(adults) ? adults : undefined,
      priceMax: Number.isFinite(max) ? max : undefined,
      selectedKeys: Array.from(selected),
    });
  }, [place, range, guests, priceMax, selected]);

  function resetToHomepage() {
    setStep("vibe");
    setSelected(new Set());
    setPlace("");
    setRange(undefined);
    setGuests("");
    setPriceMax("");
  }

  function persistCurrentSearch() {
    const checkin = range?.from
      ? format(range.from, "yyyy-MM-dd")
      : undefined;
    const checkout = range?.to ? format(range.to, "yyyy-MM-dd") : undefined;
    const adults = guests ? Number(guests) : undefined;
    const max = priceMax ? Number(priceMax) : undefined;
    const next = savePreviousSearch({
      url: searchUrl,
      vibeKeys: Array.from(selected),
      place,
      checkin,
      checkout,
      guests: Number.isFinite(adults) && adults! > 0 ? adults : undefined,
      priceMax: Number.isFinite(max) && max! > 0 ? max : undefined,
    });
    setPreviousSearches(next);
  }

  useEffect(() => {
    setPreviousSearches(loadPreviousSearches());

    try {
      if (sessionStorage.getItem(PENDING_RESET_KEY) === "1") {
        sessionStorage.removeItem(PENDING_RESET_KEY);
        resetToHomepage();
        setPreviousSearches(loadPreviousSearches());
      }
    } catch {
      /* private mode */
    }

    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      try {
        if (sessionStorage.getItem(PENDING_RESET_KEY) === "1") {
          sessionStorage.removeItem(PENDING_RESET_KEY);
          resetToHomepage();
          setPreviousSearches(loadPreviousSearches());
        }
      } catch {
        /* private mode */
      }
    }

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount / bfcache return
  }, []);

  if (step === "search") {
    return (
      <div className="min-h-screen bg-white text-[#222]">
        <main className="mx-auto w-full max-w-3xl px-6">
          <div className="mx-auto flex max-w-md flex-col gap-6 pt-12 pb-16">
            <button
              type="button"
              onClick={() => setStep("vibe")}
              className="flex items-center gap-1.5 self-start text-[14px] font-medium text-[#222]"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              Categories
            </button>

            <div className="flex flex-col gap-5">
              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#222]">
                  Where
                </label>
                <PlaceInput value={place} onChange={setPlace} />
                <p className="mt-1.5 text-[13px] text-[#B0B0B0]">
                  Leave empty to search everywhere.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#222]">
                  When
                </label>
                <WhenPicker range={range} onChange={setRange} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-[15px] font-semibold text-[#222]">
                    Guests
                  </label>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Any"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full rounded-xl border border-[#DDDDDD] bg-white px-4 py-3.5 text-[16px] text-[#222] outline-none transition-colors placeholder:text-[#B0B0B0] focus:border-[#222]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[15px] font-semibold text-[#222]">
                    Max / night
                  </label>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Any"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full rounded-xl border border-[#DDDDDD] bg-white px-4 py-3.5 text-[16px] text-[#222] outline-none transition-colors placeholder:text-[#B0B0B0] focus:border-[#222]"
                  />
                </div>
              </div>
            </div>

            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                persistCurrentSearch();
                track("vibe_search_opened", {
                  vibe_count: selectedCount,
                  has_place: Boolean(place.trim()),
                  has_dates: Boolean(range?.from),
                });
                try {
                  sessionStorage.setItem(PENDING_RESET_KEY, "1");
                } catch {
                  /* private mode */
                }
                // New tab keeps this page open — reset immediately.
                // Same-tab / bfcache return is handled via pageshow + PENDING_RESET_KEY.
                window.setTimeout(() => {
                  resetToHomepage();
                  try {
                    sessionStorage.removeItem(PENDING_RESET_KEY);
                  } catch {
                    /* private mode */
                  }
                }, 0);
              }}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-[#FF385C] text-[16px] font-medium text-white transition-colors duration-200 hover:bg-[#E31C5F]"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={3} />
              Search on Airbnb
            </a>
            <p className="text-center text-[12px] text-[#B0B0B0]">
              You will be redirected to Airbnb next
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <div className="pb-40">
        <header className="px-6 pt-16 pb-8 text-center sm:pt-20 sm:pb-10">
          <h1 className="sr-only">Airbnb Gems</h1>
          <BrandMark />
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#717171]">
            In 2025, Airbnb quietly hid unique categories from its app, making
            it harder to search for special places to stay at. I made this tool
            to fix this.
          </p>
        </header>

        <main className="mx-auto w-full max-w-3xl px-6">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {ALL_VIBES.map((vibe) => {
              const key = vibeKey(vibe);
              return (
                <VibeTile
                  key={key}
                  active={selected.has(key)}
                  icon={vibe.icon}
                  label={vibe.label}
                  onClick={() => {
                    setSelected((prev) => toggleVibeKey(prev, vibe));
                    track("vibe_toggled", {
                      vibe: vibe.label,
                      selected: !selected.has(key),
                    });
                  }}
                />
              );
            })}
            <VibeTile
              active={false}
              icon="/icons/other.svg"
              label="Other"
              onClick={() => {
                track("other_clicked");
                setShowCategoryRequest(true);
              }}
            />
          </div>

          {previousSearches.length > 0 && (
            <section className="mt-12 pb-4">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#717171]" strokeWidth={2} />
                <h2 className="text-[15px] font-semibold text-[#222]">
                  Previous searches
                </h2>
              </div>
              <ul className="divide-y divide-[#EBEBEB] border-y border-[#EBEBEB]">
                {previousSearches.map((search) => {
                  const summary = summarizeSearch(search);
                  return (
                    <li key={search.id}>
                      <a
                        href={search.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          track("previous_search_opened", {
                            vibe_count: search.vibeKeys.length,
                            has_place: Boolean(search.place.trim()),
                          });
                        }}
                        className="flex items-start gap-3 py-3.5 transition-colors hover:bg-[#F7F7F7]"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F7F7F7]">
                          <Search
                            className="h-4 w-4 text-[#222]"
                            strokeWidth={2.5}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-[#222]">
                            {search.vibeLabels.length
                              ? search.vibeLabels.join(" · ")
                              : "Airbnb search"}
                          </span>
                          {summary ? (
                            <span className="mt-0.5 block truncate text-[13px] text-[#717171]">
                              {summary}
                            </span>
                          ) : (
                            <span className="mt-0.5 block text-[13px] text-[#B0B0B0]">
                              Anywhere · Any dates
                            </span>
                          )}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EBEBEB] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <p className="text-[14px] text-[#717171]">
            {canContinue
              ? `${selectedCount} categor${selectedCount === 1 ? "y" : "ies"} selected`
              : "Pick a category to begin"}
          </p>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => {
              track("vibe_continue", { vibe_count: selectedCount });
              setStep("search");
            }}
            className={[
              "h-12 rounded-lg px-7 text-[16px] font-medium text-white transition-colors duration-200",
              canContinue
                ? "cursor-pointer bg-[#FF385C] hover:bg-[#E31C5F]"
                : "cursor-not-allowed bg-[#FFB3C1]",
            ].join(" ")}
          >
            Continue
          </button>
        </div>
      </div>

      {showCategoryRequest && (
        <MissingFilterModal
          visitorId={visitorId}
          eyebrow="Request a category"
          onClose={() => setShowCategoryRequest(false)}
        />
      )}
    </div>
  );
}

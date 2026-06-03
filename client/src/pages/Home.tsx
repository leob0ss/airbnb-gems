import FilterBar, { type ActiveFilters } from "@/components/FilterBar";
import ListingCard from "@/components/ListingCard";
import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import ListingsMap from "@/components/ListingsMap";
import MissingFilterModal from "@/components/MissingFilterModal";
import SurveyBanner from "@/components/SurveyBanner";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Map, LayoutGrid, X, Mail } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Stable session ID for click tracking (no PII)
function getSessionId(): string {
  const key = "ds_session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

const ITEMS_PER_PAGE = 24;

// Category definitions
const CATEGORIES = [
  {
    id: "Treehouse",
    label: "Treehouses",
    emoji: "🌲",
    icon: (
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M16 2 L4 14 L10 14 L10 28 L22 28 L22 14 L28 14 Z" />
        <path d="M16 2 L6 12 L26 12 Z" />
        <path d="M12 28 L12 20 L20 20 L20 28" />
      </svg>
    ),
  },
  {
    id: "A-Frame",
    label: "A-Frames",
    emoji: "🏔️",
    icon: (
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M16 2 L2 28 L30 28 Z" />
        <path d="M10 28 L10 18 L22 18 L22 28" />
        <path d="M8 20 L24 20" />
      </svg>
    ),
  },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mt-10 mb-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-border text-sm text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="text-sm text-muted-foreground px-3">
        Page {page} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-border text-sm text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function EmptyState({ hasFilters, onClear, onMissingFilter }: { hasFilters: boolean; onClear: () => void; onMissingFilter?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">🏡</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No listings found</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
        {hasFilters
          ? "We don't have listings for that combination yet. Try removing the state filter, or let us know what you're looking for."
          : "We don't have listings in this category yet. Let us know what you're looking for and we'll add it."}
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-sm font-semibold underline text-foreground hover:text-muted-foreground transition-colors"
          >
            Remove filter
          </button>
        )}
        {onMissingFilter && (
          <button
            onClick={onMissingFilter}
            className="text-sm font-semibold px-4 py-2 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors"
          >
            Tell us what you need
          </button>
        )}
      </div>
    </div>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [step, setStep] = useState<"form" | "thanks">("form");

  const submit = trpc.contact.submit.useMutation();

  function validateEmail(val: string) {
    if (!val) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? "" : "Please enter a valid email.";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    const err = validateEmail(email);
    if (err) { setEmailError(err); return; }
    await submit.mutateAsync({ message: message.trim(), email: email.trim() || null });
    setStep("thanks");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-background rounded-2xl shadow-2xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {step === "form" ? (
          <>
            <h2 className="text-xl font-bold text-foreground mb-1">Get in touch</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Have a question, found a bug, or want to request a feature? We'd love to hear from you.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  maxLength={2000}
                  required
                  autoFocus
                  className="bg-secondary text-foreground placeholder:text-muted-foreground rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 resize-none border border-border"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  Your email
                  <span className="text-xs font-normal text-muted-foreground">optional</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  placeholder="you@example.com"
                  className="bg-secondary text-foreground placeholder:text-muted-foreground rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 border border-border"
                />
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              </div>
              <button
                type="submit"
                disabled={!message.trim() || submit.isPending}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors"
              >
                {submit.isPending ? "Sending…" : "Send message"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-foreground mb-2">Thanks! 🙏</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              We've received your message and will get back to you if you left an email.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("Treehouse");
  const [filters, setFilters] = useState<ActiveFilters>({});
  const [page, setPage] = useState(1);
  const [showMap, setShowMap] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showSurvey, setShowSurvey] = useState(false);
  const [missingFilterOpen, setMissingFilterOpen] = useState(false);

  // Show survey after the 2nd Airbnb click (only once per session)
  const handleTrackedClick = useCallback(() => {
    setClickCount((prev) => {
      const next = prev + 1;
      if (next === 2) setShowSurvey(true);
      return next;
    });
  }, []);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  // Reset bounds whenever map view is toggled
  const handleToggleMap = (next: boolean) => {
    if (!next) setMapBounds(null);
    setShowMap(next);
  };

  const sessionId = useMemo(() => getSessionId(), []);
  const gridRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [filterSticky, setFilterSticky] = useState(false);

  // Make filter bar sticky only after the hero scrolls out of view
  useEffect(() => {
    if (showMap) return;
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFilterSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [showMap]);

  // Reset to page 1 when filters or category change
  useEffect(() => {
    setPage(1);
  }, [filters, activeCategory]);

  const STATE_LABELS: Record<string, string> = {
    AK: "Alaska", AL: "Alabama", AR: "Arkansas", AZ: "Arizona", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", IA: "Iowa", ID: "Idaho", IL: "Illinois", IN: "Indiana",
    KS: "Kansas", KY: "Kentucky", LA: "Louisiana", MA: "Massachusetts", MD: "Maryland",
    ME: "Maine", MI: "Michigan", MN: "Minnesota", MO: "Missouri", MS: "Mississippi",
    MT: "Montana", NC: "North Carolina", ND: "North Dakota", NE: "Nebraska",
    NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NV: "Nevada",
    NY: "New York", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
    RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
    TX: "Texas", UT: "Utah", VA: "Virginia", VT: "Vermont", WA: "Washington",
    WI: "Wisconsin", WV: "West Virginia", WY: "Wyoming",
  };
  const activeFilterLabel = filters.state ? (STATE_LABELS[filters.state] ?? filters.state) : undefined;

  const { data: filtersData } = trpc.listings.getFilters.useQuery();
  const availableStates = filtersData?.regions ?? [];

  // For map view, fetch all listings (no pagination limit)
  const { data: allData } = trpc.listings.getAll.useQuery(
    { region: filters.state, category: activeCategory, page: 1, limit: 500 },
    { enabled: showMap }
  );

  const { data, isLoading, isFetching } = trpc.listings.getAll.useQuery({
    region: filters.state,
    category: activeCategory,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const listings = data?.listings ?? [];
  const allListings = allData?.listings ?? [];

  // In map view, filter the grid to only listings within the current map bounds.
  const visibleListings = useMemo(() => {
    if (!showMap) return listings;
    const source = allListings.length > 0 ? allListings : listings;
    if (!mapBounds) return source;
    return source.filter((l) => {
      const lat = l.latitude ? Number(l.latitude) : null;
      const lng = l.longitude ? Number(l.longitude) : null;
      if (!lat || !lng) return false;
      return (
        lat >= mapBounds.south &&
        lat <= mapBounds.north &&
        lng >= mapBounds.west &&
        lng <= mapBounds.east
      );
    });
  }, [listings, allListings, showMap, mapBounds]);

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory)!;

  return (
    <div className={showMap ? "h-screen bg-background flex flex-col overflow-hidden" : "min-h-screen bg-background flex flex-col"}>

      {/* ─── Navigation ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-background border-b border-border flex-shrink-0">
        <div className="max-w-[1760px] mx-auto px-6 sm:px-10 flex items-center justify-between h-[80px]">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2 flex-shrink-0" aria-label="Airbnb Gems home">
            <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" aria-hidden="true">
              <polygon points="14,2 24,7.5 24,20.5 14,26 4,20.5 4,7.5" fill="#FF385C" />
              <polygon points="14,7 20,10.5 20,17.5 14,21 8,17.5 8,10.5" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
              <line x1="14" y1="2" x2="14" y2="7" stroke="white" strokeWidth="1" opacity="0.5" />
              <line x1="24" y1="7.5" x2="20" y2="10.5" stroke="white" strokeWidth="1" opacity="0.5" />
              <line x1="4" y1="7.5" x2="8" y2="10.5" stroke="white" strokeWidth="1" opacity="0.5" />
            </svg>
            <span className="font-bold text-xl tracking-tight text-foreground" style={{fontFamily: "'Inter', sans-serif"}}>Airbnb <span className="text-[#FF385C]">Gems</span></span>
          </a>

          {/* Contact link */}
          <button
            onClick={() => setShowContact(true)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact
          </button>

        </div>
      </nav>

      {/* ─── Main content ────────────────────────────────────────────────────── */}
      {showMap ? (
        /* ── MAP VIEW: split layout ── */
        <div className="flex flex-col flex-1 min-h-0">
          {/* ── Category tabs + filter bar (map view) ── */}
          <div className="border-b border-border bg-background flex-shrink-0 z-30">
            <div className="max-w-[1760px] mx-auto px-6 sm:px-10">
              <div className="flex items-center gap-2 py-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex flex-col items-center gap-1 pb-1 px-3 border-b-2 transition-colors ${
                      activeCategory === cat.id
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {cat.icon}
                    <span className="text-xs font-semibold">{cat.label}</span>
                  </button>
                ))}
                <div className="h-8 w-px bg-border mx-2" />
                <FilterBar
                  filters={filters}
                  availableStates={availableStates}
                  onFilterChange={setFilters}
                  inline
                />
                {activeFilterLabel && (
                  <span className="text-sm text-muted-foreground hidden sm:block ml-2">
                    <span className="font-semibold text-foreground">{allListings.length}</span> {currentCategory.label.toLowerCase()} in {activeFilterLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Split panel ── */}
          <div className="flex flex-1 min-h-0">
          {/* Left: scrollable grid */}
          <div className="w-[45%] xl:w-[40%] overflow-y-auto flex-shrink-0 border-r border-border">
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6" ref={gridRef}>
              {isLoading || isFetching
                ? Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)
                : visibleListings.map((listing) => (
                    <div
                      key={listing.id}
                      onMouseEnter={() => setHoveredId(listing.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <ListingCard
                        listing={listing}
                        activeFilter={activeFilterLabel}
                        sessionId={sessionId}
                      />
                    </div>
                  ))}
            </div>
            {totalPages > 1 && !isLoading && (
              <div className="px-6 pb-6">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>

          {/* Right: sticky map */}
          <div className="flex-1 relative">
            <ListingsMap
              listings={allListings.length > 0 ? allListings : listings}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onBoundsChange={setMapBounds}
            />
          </div>
          </div>{/* end split panel */}
        </div>
      ) : (
        /* ── GRID VIEW ── */
        <>
          {/* ── Hero ── */}
          <header ref={heroRef} className="relative border-b border-border overflow-hidden flex-shrink-0">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/SVG%3E")`,
              }}
            />
            <div className="max-w-[1760px] mx-auto px-6 sm:px-10 relative py-8 md:py-10">
              <div className="max-w-4xl">
                <h1 className="text-3xl md:text-4xl leading-[1.1] text-foreground mb-3" style={{fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300}}>
                  <span style={{fontWeight: 700}}>Airbnb removed their category filters.</span>
                  <em className="italic"> We brought them back.</em>
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  In 2025, Airbnb quietly removed certain categories from its navigation. Some of us missed them so much that we created this tool to find them again.
                </p>
                <p className="text-xs text-muted-foreground/60">
                  We are not affiliated with or endorsed by Airbnb, Inc.
                </p>
              </div>
            </div>
          </header>

          {/* ── Category tabs + filter bar ── */}
          <div className={`border-b border-border bg-background z-30 transition-shadow ${
            filterSticky ? "sticky top-[80px] shadow-sm" : ""
          }`}>
            <div className="max-w-[1760px] mx-auto px-6 sm:px-10">
              <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-none">
                {/* Category tabs */}
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 pb-1 px-3 border-b-2 transition-colors ${
                      activeCategory === cat.id
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {cat.icon}
                    <span className="text-xs font-semibold">{cat.label}</span>
                  </button>
                ))}

                {/* Missing filter CTA */}
                <button
                  onClick={() => setMissingFilterOpen(true)}
                  className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border hover:border-foreground/40 rounded-full px-3 py-1.5 transition-colors"
                >
                  <span>Missing your filter?</span>
                </button>

                <div className="hidden sm:block h-8 w-px bg-border mx-2" />

                <div className="hidden sm:block">
                <FilterBar
                  filters={filters}
                  availableStates={availableStates}
                  onFilterChange={setFilters}
                  inline
                />
                </div>
                {activeFilterLabel && (
                  <span className="text-sm text-muted-foreground hidden sm:block ml-2">
                    <span className="font-semibold text-foreground">{total}</span> {currentCategory.label.toLowerCase()} in {activeFilterLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <main className="max-w-[1760px] mx-auto w-full px-6 sm:px-10 py-8 flex-1" ref={gridRef}>
          {isLoading || isFetching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <EmptyState hasFilters={Boolean(activeFilterLabel)} onClear={() => setFilters({})} onMissingFilter={() => setMissingFilterOpen(true)} />
          ) : (
            <>
              {/* Result count */}
              <p className="text-sm text-foreground font-semibold mb-6">
                {total > 0 ? `${total.toLocaleString()} ${currentCategory.label.toLowerCase()}` : ""}
                {activeFilterLabel ? ` in ${activeFilterLabel}` : ""}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    onMouseEnter={() => setHoveredId(listing.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <ListingCard
                      listing={listing}
                      activeFilter={activeFilterLabel}
                      sessionId={sessionId}
                      onTrackedClick={handleTrackedClick}
                    />
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </main>
        </>
      )}

      {/* ─── Floating map/grid toggle (desktop only) ─────────────────────── */}
      <div className="hidden sm:block fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => handleToggleMap(!showMap)}
          className="flex items-center gap-2 px-5 py-3 bg-foreground text-background rounded-full shadow-lg text-sm font-semibold hover:scale-105 active:scale-95 transition-transform duration-150"
        >
          {showMap ? (
            <>
              <LayoutGrid className="w-4 h-4" />
              Show list
            </>
          ) : (
            <>
              <Map className="w-4 h-4" />
              Show map
            </>
          )}
        </button>
      </div>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      {!showMap && (
        <footer className="border-t border-border mt-8 flex-shrink-0 bg-secondary">
          <div className="max-w-[1760px] mx-auto px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Airbnb Gems · Not affiliated with or endorsed by Airbnb, Inc. · All listings link to official Airbnb pages.
            </p>
            <p className="text-sm text-muted-foreground">
              Data sourced from Airbnb's public listing pages.
            </p>
          </div>
        </footer>
      )}

      {/* PMF Survey banner */}
      {showSurvey && (
        <SurveyBanner
          sessionId={sessionId}
          activeCategory={activeCategory}
          activeState={filters.state ?? null}
          onDismiss={() => setShowSurvey(false)}
        />
      )}

      {/* Contact modal */}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}

      {/* Missing filter demand-capture modal */}
      {missingFilterOpen && (
        <MissingFilterModal
          sessionId={sessionId}
          onClose={() => setMissingFilterOpen(false)}
        />
      )}
    </div>
  );
}

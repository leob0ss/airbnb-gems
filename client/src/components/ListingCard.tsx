import { Star } from "lucide-react";
import { useCallback } from "react";
import type { StaticListing } from "@/lib/listingsData";

interface ListingCardProps {
  listing: StaticListing;
  activeFilter?: string;
  sessionId?: string;
  /** Called after the user opens the Airbnb listing */
  onTrackedClick?: () => void;
}

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80",
  "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
  "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80",
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80",
  "https://images.unsplash.com/photo-1475855581690-80accde3ae2b?w=800&q=80",
];

function getPlaceholder(id: number): string {
  return PLACEHOLDER_IMAGES[id % PLACEHOLDER_IMAGES.length];
}

/** Format location as "City, State" for US or "City, Country" for international */
function formatLocation(city: string | null, region: string | null, country: string | null): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  if (region && region !== "NULL") {
    parts.push(region);
  } else if (country && country !== "US") {
    parts.push(country);
  }
  return parts.join(", ");
}

export default function ListingCard({ listing, onTrackedClick }: ListingCardProps) {
  const imageUrl = listing.imageUrl || getPlaceholder(listing.id);
  const location = formatLocation(listing.city, listing.region, listing.country);

  const handleClick = useCallback(() => {
    window.open(listing.airbnbUrl, "_blank", "noopener,noreferrer");
    onTrackedClick?.();
  }, [listing.airbnbUrl, onTrackedClick]);

  return (
    <article
      className="listing-card group cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      aria-label={`View ${listing.title} on Airbnb`}
    >
      {/* Image */}
      <div className="card-image relative overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: "20/19" }}>
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getPlaceholder(listing.id);
          }}
        />
      </div>

      {/* Content */}
      <div className="mt-3">
        {/* Row 1: title (primary, left) + rating with review count (right) */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1 flex-1">
            {listing.title}
          </p>
          {listing.rating ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-3 h-3 fill-foreground text-foreground" />
              <span className="text-sm text-foreground">
                {listing.rating.toFixed(2)}
                {listing.reviewCount ? (
                  <span className="text-muted-foreground font-normal"> ({listing.reviewCount.toLocaleString()})</span>
                ) : null}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground flex-shrink-0">New</span>
          )}
        </div>

        {/* Row 2: location (secondary) */}
        {location ? (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{location}</p>
        ) : null}

        {/* Row 3: beds */}
        {listing.bedrooms ? (
          <p className="text-sm text-muted-foreground mt-0.5">
            {listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}
          </p>
        ) : null}
      </div>
    </article>
  );
}

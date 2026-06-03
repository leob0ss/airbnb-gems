/// <reference types="@types/google.maps" />

import { MapView } from "@/components/Map";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import { BedDouble, ExternalLink, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Listing {
  id: number;
  airbnbId: string;
  title: string;
  imageUrl: string | null;
  airbnbUrl: string;
  rating: number | null;
  reviewCount: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  bedrooms?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface ListingsMapProps {
  listings: Listing[];
  hoveredId?: number | null;
  onHover?: (id: number | null) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=400&q=80";

function formatLocation(city: string | null, region: string | null, country: string | null): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  if (region && region !== "NULL") parts.push(region);
  else if (country && country !== "US") parts.push(country);
  return parts.join(", ");
}

/** Custom cluster renderer — matches the pill style of individual markers */
function createClusterRenderer() {
  return {
    render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
      const pill = document.createElement("div");
      pill.textContent = String(count);
      pill.style.cssText = `
        background: #111;
        color: white;
        font-size: 13px;
        font-weight: 700;
        font-family: inherit;
        padding: 6px 12px;
        border-radius: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.28);
        cursor: pointer;
        white-space: nowrap;
        border: 2px solid white;
        min-width: 36px;
        text-align: center;
        transition: transform 0.15s ease;
      `;
      return new window.google.maps.marker.AdvancedMarkerElement({
        position,
        content: pill,
        zIndex: 1000,
      });
    },
  };
}

export default function ListingsMap({ listings, hoveredId, onHover, onBoundsChange }: ListingsMapProps) {
  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const idleListenerRef = useRef(false);

  const initMap = (map: google.maps.Map) => {
    mapRef.current = map;
    if (!idleListenerRef.current) {
      idleListenerRef.current = true;
      map.addListener("idle", () => {
        const b = map.getBounds();
        if (!b) return;
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        onBoundsChangeRef.current?.({
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        });
      });
    }
  };

  const placeMarkers = (map: google.maps.Map, listingsToPin: Listing[]) => {
    // Destroy existing clusterer and clear markers
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current.clear();

    const geoListings = listingsToPin.filter((l) => l.latitude && l.longitude);
    if (geoListings.length === 0) return;

    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    geoListings.forEach((listing) => {
      const label = listing.rating ? `★ ${listing.rating.toFixed(2)}` : "New";

      const pill = document.createElement("div");
      pill.className = "map-marker-pill";
      pill.textContent = label;
      pill.style.cssText = `
        background: white;
        color: #111;
        font-size: 12px;
        font-weight: 600;
        font-family: inherit;
        padding: 5px 10px;
        border-radius: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        cursor: pointer;
        white-space: nowrap;
        border: 1.5px solid transparent;
        transition: all 0.15s ease;
      `;

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: null, // clusterer manages map assignment
        position: { lat: Number(listing.latitude!), lng: Number(listing.longitude!) },
        title: listing.title,
        content: pill,
      });

      marker.addListener("click", (e: google.maps.MapMouseEvent) => {
        setSelectedListing(listing);
        const container = (map.getDiv() as HTMLElement).getBoundingClientRect();
        const point = e.domEvent as MouseEvent;
        setPopupPos({
          x: point.clientX - container.left,
          y: point.clientY - container.top,
        });
        pill.style.background = "#222";
        pill.style.color = "white";
        pill.style.borderColor = "#222";
      });

      markersRef.current.set(listing.id, marker);
      newMarkers.push(marker);
    });

    // Create clusterer with SuperCluster algorithm (better performance)
    clustererRef.current = new MarkerClusterer({
      map,
      markers: newMarkers,
      algorithm: new SuperClusterAlgorithm({ radius: 60, maxZoom: 10 }),
      renderer: createClusterRenderer(),
    });
  };

  // Highlight marker on hover from grid
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const pill = marker.content as HTMLElement;
      if (!pill) return;
      const listing = listings.find((l) => l.id === id);
      const isSelected = selectedListing?.id === id;
      if (id === hoveredId) {
        pill.style.background = "#222";
        pill.style.color = "white";
        pill.style.borderColor = "#222";
        pill.style.transform = "scale(1.1)";
        pill.style.zIndex = "10";
      } else if (isSelected) {
        pill.style.background = "#222";
        pill.style.color = "white";
        pill.style.borderColor = "#222";
        pill.style.transform = "scale(1)";
        pill.style.zIndex = "5";
      } else {
        pill.style.background = "white";
        pill.style.color = "#111";
        pill.style.borderColor = "transparent";
        pill.style.transform = "scale(1)";
        pill.style.zIndex = "1";
      }
    });
  }, [hoveredId, selectedListing, listings]);

  // Re-place markers whenever listings change and map is ready
  useEffect(() => {
    if (mapRef.current) {
      placeMarkers(mapRef.current, listings);
    }
  }, [listings]);

  const closePopup = () => {
    setSelectedListing(null);
    setPopupPos(null);
    markersRef.current.forEach((marker) => {
      const pill = marker.content as HTMLElement;
      if (pill) {
        pill.style.background = "white";
        pill.style.color = "#111";
        pill.style.borderColor = "transparent";
      }
    });
  };

  return (
    <div className="relative w-full h-full">
      <MapView
        className="w-full h-full"
        initialCenter={{ lat: 38.5, lng: -96 }}
        initialZoom={4}
        onMapReady={(map) => { initMap(map); placeMarkers(map, listings); }}
      />

      {/* Popup card */}
      {selectedListing && popupPos && (
        <div
          className="absolute z-50 w-64 bg-card rounded-xl overflow-hidden shadow-2xl border border-border"
          style={{
            left: Math.min(popupPos.x, window.innerWidth - 280),
            top: Math.max(popupPos.y - 280, 8),
          }}
        >
          <button
            onClick={closePopup}
            className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-sm hover:bg-white transition-colors"
          >
            <X className="w-3.5 h-3.5 text-foreground/70" />
          </button>

          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={selectedListing.imageUrl || PLACEHOLDER}
              alt={selectedListing.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
            />
          </div>

          <div className="p-3">
            {formatLocation(selectedListing.city, selectedListing.region, selectedListing.country) && (
              <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground mb-1">
                {formatLocation(selectedListing.city, selectedListing.region, selectedListing.country)}
              </p>
            )}
            <h3 className="text-sm leading-snug text-foreground mb-2 line-clamp-2" style={{fontFamily: "'Playfair Display', Georgia, serif"}}>
              {selectedListing.title}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {selectedListing.rating ? (
                  <>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium text-foreground">
                      {selectedListing.rating.toFixed(2)}
                    </span>
                    {selectedListing.reviewCount ? (
                      <span className="text-xs text-muted-foreground">
                        ({selectedListing.reviewCount})
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">New</span>
                )}
              </div>
              {selectedListing.bedrooms ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BedDouble className="w-3 h-3" />
                  <span>{selectedListing.bedrooms} bed{selectedListing.bedrooms !== 1 ? "s" : ""}</span>
                </div>
              ) : null}
            </div>
            <a
              href={selectedListing.airbnbUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex items-center justify-center gap-1.5 w-full text-xs font-medium bg-foreground text-background rounded-lg py-2 hover:bg-foreground/90 transition-colors"
            >
              View on Airbnb
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Every Airbnb filter the Describe search may turn on, with the URL params it
 * adds. IDs were read from Airbnb's filter panel data or verified by result
 * counts (Sept–Oct 2026). Airbnb does not document these and can change them.
 * An unknown amenity ID makes Airbnb show an error page, so only add IDs that
 * have been checked against live results.
 */

import { WORDS } from "./words.js";

export type FilterGroup =
  | "place-type"
  | "property-type"
  | "amenity"
  | "location"
  | "category"
  | "quality"
  | "booking"
  | "accessibility"
  | "host-language";

export type CatalogFilter = {
  key: string;
  label: string;
  group: FilterGroup;
  /** Extra guidance for Claude on when this filter applies. */
  hint?: string;
  /** Words that name the thing itself; from words.ts. */
  exact?: string[];
  /** Phrases that strongly imply it; from words.ts. */
  closeEnough?: string[];
  params: [string, string][];
};

const propertyType = (
  key: string,
  label: string,
  id: number,
  hint?: string,
): CatalogFilter => ({
  key,
  label,
  group: "property-type",
  hint,
  params: [["property_type_id[]", String(id)]],
});

const amenity = (
  key: string,
  label: string,
  id: number,
  group: FilterGroup = "amenity",
  hint?: string,
): CatalogFilter => ({
  key,
  label,
  group,
  hint,
  params: [["amenities[]", String(id)]],
});

const tag = (
  key: string,
  label: string,
  id: number,
  group: FilterGroup,
  hint?: string,
): CatalogFilter => ({
  key,
  label,
  group,
  hint,
  params: [["kg_and_tags[]", `Tag:${id}`]],
});

const language = (code: string, label: string): CatalogFilter => ({
  key: `host-language-${code}`,
  label: `Host speaks ${label}`,
  group: "host-language",
  params: [["host_languages[]", code]],
});

const BASE_CATALOG: CatalogFilter[] = [
  {
    key: "entire-home",
    label: "Entire home",
    group: "place-type",
    hint: "the guest has the whole place to themselves",
    params: [["room_types[]", "Entire home/apt"]],
  },
  {
    key: "private-room",
    label: "Private room",
    group: "place-type",
    hint: "a room in a shared home",
    params: [["room_types[]", "Private room"]],
  },
  {
    key: "private-bathroom",
    label: "Private attached bathroom",
    group: "place-type",
    hint: "only for private rooms that need an ensuite",
    params: [
      ["room_types[]", "Private room"],
      ["bathroom_privacy[]", "ENSUITE"],
    ],
  },

  // Property types are ORed by Airbnb, so several can be picked together.
  propertyType("home", "Home", 2, "a regular house"),
  propertyType("apartment", "Apartment", 1),
  propertyType("condo", "Condo", 37),
  propertyType("loft", "Loft", 35),
  propertyType("townhouse", "Townhouse", 36),
  propertyType("guesthouse", "Guesthouse", 40),
  propertyType("guest-suite", "Guest suite", 53),
  propertyType("cabin", "Cabin", 4),
  propertyType("cottage", "Cottage", 60),
  propertyType("bungalow", "Bungalow", 38),
  propertyType("chalet", "Chalet", 22),
  propertyType("villa", "Villa", 11),
  propertyType("tiny-home", "Tiny home", 67),
  propertyType("treehouse", "Treehouse", 6),
  propertyType("castle", "Castle", 5),
  propertyType("cave", "Cave", 18),
  propertyType("dome", "Dome", 17),
  propertyType("yurt", "Yurt", 15),
  propertyType("tent", "Tent", 34),
  propertyType("campsite", "Campsite", 58),
  propertyType("camper", "Camper/RV", 32),
  propertyType("hut", "Hut", 24),
  propertyType("shepherds-hut", "Shepherd's hut", 66),
  propertyType("earth-home", "Earth home", 23),
  propertyType("barn", "Barn", 57),
  propertyType("farm-stay", "Farm stay", 63),
  propertyType("boat", "Boat", 8),
  propertyType("houseboat", "Houseboat", 64),
  propertyType("island", "Island", 19, "a private island"),
  propertyType("lighthouse", "Lighthouse", 10),
  propertyType("windmill", "Windmill", 69),
  propertyType("igloo", "Igloo", 12),
  propertyType("train", "Train", 25, "a converted train car"),
  propertyType("plane", "Plane", 28, "a converted airplane"),
  propertyType("trullo", "Trullo", 68, "cone-roofed stone houses in Puglia, Italy"),
  propertyType("dammuso", "Dammuso", 62, "domed stone houses on Pantelleria, Italy"),
  propertyType("cycladic-home", "Cycladic home", 61, "whitewashed Greek island homes"),
  propertyType("nature-lodge", "Nature lodge", 44),
  propertyType("hotel", "Hotel", 42),
  propertyType("boutique-hotel", "Boutique hotel", 43),
  propertyType("resort", "Resort", 65),

  amenity("wifi", "Wifi", 4),
  amenity("air-conditioning", "Air conditioning", 5),
  amenity("kitchen", "Kitchen", 8),
  amenity("heating", "Heating", 30),
  amenity("washer", "Washer", 33),
  amenity("dryer", "Dryer", 34),
  amenity("tv", "TV", 58),
  amenity("hair-dryer", "Hair dryer", 45),
  amenity("iron", "Iron", 46),
  amenity("workspace", "Dedicated workspace", 47),
  amenity("pool", "Pool", 7),
  amenity("hot-tub", "Hot tub", 25, "amenity", "not an indoor jetted bathtub (\"jacuzzi tub\")"),
  amenity("sauna", "Sauna", 223),
  amenity("free-parking", "Free parking", 9),
  amenity("ev-charger", "EV charger", 97),
  amenity("gym", "Gym", 15),
  amenity("bbq", "BBQ grill", 99),
  amenity("breakfast", "Breakfast", 16),
  amenity("fireplace", "Indoor fireplace", 27),
  amenity("fire-pit", "Fire pit", 219),
  amenity("patio-balcony", "Patio or balcony", 100),
  amenity("game-room", "Game room", 446),
  amenity("pool-table", "Pool table", 521),
  amenity("game-console", "Game console", 75),
  amenity("arcade", "Arcade games", 371),
  amenity("board-games", "Board games", 392),
  amenity("movie-theater", "Movie theater", 459),
  amenity("playroom", "Children's playroom", 363),
  amenity("crib", "Crib", 286, "amenity", "travelling with a baby"),
  amenity("king-bed", "King-size bed", 1000),
  amenity("elevator", "Elevator", 21),
  amenity("smoking-allowed", "Smoking allowed", 11),
  amenity("smoke-alarm", "Smoke alarm", 35),
  amenity("co-alarm", "Carbon monoxide alarm", 36),

  tag("waterfront", "Waterfront", 686, "location", "on a lake, river or sea"),
  tag("beachfront", "Beachfront", 789, "location", "directly on a beach"),
  tag("ski-in-out", "Ski-in/ski-out", 681, "location", "direct access to ski slopes"),
  amenity("lake-access", "Lake access", 133, "location"),

  tag("a-frame", "A-frame", 8148, "category"),
  tag("tower", "Tower", 8187, "category"),
  tag("design", "Design", 8528, "category", "architecturally striking homes"),
  tag("omg", "OMG!", 8225, "category", "wildly unusual stays"),

  {
    key: "guest-favorite",
    label: "Guest favorite",
    group: "quality",
    hint: "top-rated homes guests love",
    params: [["guest_favorite", "true"]],
  },
  {
    key: "superhost",
    label: "Superhost",
    group: "quality",
    params: [["superhost", "true"]],
  },
  {
    key: "luxe",
    label: "Luxe",
    group: "quality",
    hint: "only for explicit luxury requests; very few listings",
    params: [["tier_ids[]", "2"]],
  },
  {
    key: "discounted",
    label: "Discounted stays",
    group: "quality",
    hint: "deals, discounts",
    params: [["discounted_stays", "true"]],
  },

  {
    key: "instant-book",
    label: "Instant Book",
    group: "booking",
    params: [["ib", "true"]],
  },
  amenity("self-check-in", "Self check-in", 51, "booking"),

  amenity("step-free-access", "Step-free guest entrance", 110, "accessibility", "wheelchair access"),
  amenity("wide-entrance", "Guest entrance wider than 32 in", 111, "accessibility"),
  amenity("accessible-parking", "Disabled parking spot", 114, "accessibility"),
  amenity("step-free-bedroom", "Step-free bedroom access", 115, "accessibility"),
  amenity("wide-bedroom-entrance", "Bedroom entrance wider than 32 in", 116, "accessibility"),
  amenity("step-free-bathroom", "Step-free bathroom access", 120, "accessibility"),
  amenity("wide-bathroom-entrance", "Bathroom entrance wider than 32 in", 121, "accessibility"),
  amenity("step-free-shower", "Step-free shower", 296, "accessibility"),
  amenity("toilet-grab-bar", "Toilet grab bar", 295, "accessibility"),
  amenity("shower-grab-bar", "Shower grab bar", 294, "accessibility"),
  amenity("shower-chair", "Shower or bath chair", 297, "accessibility"),
  amenity("hoist", "Ceiling or mobile hoist", 291, "accessibility"),

  language("en", "English"),
  language("es", "Spanish"),
  language("fr", "French"),
  language("de", "German"),
  language("it", "Italian"),
  language("pt", "Portuguese"),
  language("nl", "Dutch"),
  language("zh", "Chinese"),
  language("ja", "Japanese"),
  language("ko", "Korean"),
  language("ar", "Arabic"),
  language("he", "Hebrew"),
  language("hi", "Hindi"),
  language("ru", "Russian"),
  language("uk", "Ukrainian"),
  language("pl", "Polish"),
  language("el", "Greek"),
  language("tr", "Turkish"),
  language("th", "Thai"),
  language("sv", "Swedish"),
  language("sgn", "Sign Language"),
];

export const CATALOG: CatalogFilter[] = BASE_CATALOG.map((f) => ({ ...f, ...WORDS[f.key] }));

export const CATALOG_BY_KEY = new Map(CATALOG.map((f) => [f.key, f]));

export const CATALOG_KEYS = CATALOG.map((f) => f.key);

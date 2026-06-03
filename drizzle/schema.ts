import {
  bigint,
  decimal,
  float,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Listings — core property records indexed from Airbnb
// ---------------------------------------------------------------------------
export const listings = mysqlTable(
  "listings",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Airbnb's own listing ID (numeric string) */
    airbnbId: varchar("airbnbId", { length: 24 }).notNull().unique(),
    title: text("title").notNull(),
    /** Primary hero image URL from Airbnb CDN */
    imageUrl: text("imageUrl"),
    /** Direct link to the Airbnb listing page */
    airbnbUrl: text("airbnbUrl").notNull(),
    /** Average star rating (0–5) */
    rating: float("rating"),
    /** Number of reviews */
    reviewCount: int("reviewCount"),
    /** Approximate price per night in USD */
    pricePerNight: int("pricePerNight"),
    /** Number of bedrooms */
    bedrooms: int("bedrooms"),
    /** City / neighbourhood label */
    city: varchar("city", { length: 128 }),
    /** State or region label */
    region: varchar("region", { length: 128 }),
    /** Country code (ISO 3166-1 alpha-2) */
    country: varchar("country", { length: 8 }).default("US"),
    /** WGS-84 latitude */
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    /** WGS-84 longitude */
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    /** Raw listing description text */
    description: text("description"),
    /**
     * Comma-separated list of publication names extracted from badges
     * e.g. "Architectural Digest,Dwell"
     */
    publications: text("publications"),
    /**
     * Comma-separated list of notable designer/architect names
     * e.g. "Frank Lloyd Wright"
     */
    designers: text("designers"),
    /**
     * Architectural category tag(s) — comma-separated
     * e.g. "A-frame,Treehouse,Dome,Castle,OMG"
     */
    categories: text("categories"),
    /** How the listing was discovered */
    signalSource: mysqlEnum("signalSource", [
      "badge_publication",
      "badge_designer",
      "text_match",
      "manual",
    ])
      .default("text_match")
      .notNull(),
    /** Confidence score 0–100 */
    confidence: int("confidence").default(80),
    /** Whether this listing is approved for display */
    active: mysqlEnum("active", ["yes", "no"]).default("yes").notNull(),
    /** When this listing was first indexed */
    indexedAt: timestamp("indexedAt").defaultNow().notNull(),
    /** When the listing data was last refreshed */
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_listings_region").on(t.region),
    index("idx_listings_active").on(t.active),
    index("idx_listings_signal").on(t.signalSource),
  ]
);

export type Listing = typeof listings.$inferSelect;
export type InsertListing = typeof listings.$inferInsert;

// ---------------------------------------------------------------------------
// Badges — individual editorial badge records per listing
// ---------------------------------------------------------------------------
export const badges = mysqlTable(
  "badges",
  {
    id: int("id").autoincrement().primaryKey(),
    listingId: int("listingId")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    /** Badge type from Airbnb's niobeClientData */
    badgeType: mysqlEnum("badgeType", [
      "LISTING_DESIGN_PUBLICATIONS",
      "LISTING_NOTABLE_DESIGNER",
      "TEXT_MATCH",
      "OTHER",
    ]).notNull(),
    /** Human-readable label e.g. "Featured in Dwell" */
    label: text("label").notNull(),
    /** Extracted value e.g. "Dwell" or "Bjarke Ingels Group" */
    value: varchar("value", { length: 256 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("idx_badges_listing").on(t.listingId)]
);

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;

// ---------------------------------------------------------------------------
// Click events — track user engagement / click-throughs to Airbnb
// ---------------------------------------------------------------------------
export const clickEvents = mysqlTable(
  "click_events",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    listingId: int("listingId")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    /** Optional: which filter was active when the click happened */
    activeFilter: varchar("activeFilter", { length: 128 }),
    /** Anonymised session fingerprint (no PII) */
    sessionId: varchar("sessionId", { length: 64 }),
    /** UTC timestamp of the click */
    clickedAt: timestamp("clickedAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_clicks_listing").on(t.listingId),
    index("idx_clicks_time").on(t.clickedAt),
  ]
);

export type ClickEvent = typeof clickEvents.$inferSelect;
export type InsertClickEvent = typeof clickEvents.$inferInsert;

// ---------------------------------------------------------------------------
// Survey responses — PMF signal from post-click "Did you find what you were looking for?"
// ---------------------------------------------------------------------------
export const surveyResponses = mysqlTable(
  "survey_responses",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    /** "yes" or "no" answer to the primary question */
    answer: mysqlEnum("answer", ["yes", "no"]).notNull(),
    /** Free-text follow-up answer */
    followup: text("followup"),
    /** Anonymised session fingerprint (no PII) */
    sessionId: varchar("sessionId", { length: 64 }),
    /** Active category filter when survey was shown */
    activeCategory: varchar("activeCategory", { length: 64 }),
    /** Active state filter when survey was shown */
    activeState: varchar("activeState", { length: 128 }),
    /** UTC timestamp */
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_survey_answer").on(t.answer),
    index("idx_survey_time").on(t.submittedAt),
  ]
);

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;

// ---------------------------------------------------------------------------
// Filter requests — demand capture from "Missing your filter?" CTA
// ---------------------------------------------------------------------------
export const filterRequests = mysqlTable(
  "filter_requests",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    /** What the user was looking for */
    whatLookingFor: text("whatLookingFor").notNull(),
    /** Optional email for follow-up */
    email: varchar("email", { length: 320 }),
    /** Anonymised session fingerprint (no PII) */
    sessionId: varchar("sessionId", { length: 64 }),
    /** UTC timestamp */
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_filter_requests_time").on(t.submittedAt),
  ]
);

export type FilterRequest = typeof filterRequests.$inferSelect;
export type InsertFilterRequest = typeof filterRequests.$inferInsert;

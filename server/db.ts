import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { badges, clickEvents, filterRequests, InsertBadge, InsertListing, listings, InsertUser, surveyResponses, users } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };

  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export interface ListingFilters {
  publication?: string;
  designer?: string;
  category?: string;
  region?: string;
  signalSource?: string;
  page?: number;
  limit?: number;
}

export async function getListings(filters: ListingFilters = {}) {
  const db = await getDb();
  if (!db) return { listings: [], total: 0 };

  const { publication, designer, category, region, signalSource, page = 1, limit = 24 } = filters;
  const offset = (page - 1) * limit;

  const conditions = [eq(listings.active, "yes")];

  if (publication) {
    conditions.push(like(listings.publications, `%${publication}%`));
  }
  if (designer) {
    conditions.push(like(listings.designers, `%${designer}%`));
  }
  if (category) {
    conditions.push(like(listings.categories, `%${category}%`));
  }
  if (region) {
    conditions.push(like(listings.region, `%${region}%`));
  }
  if (signalSource) {
    conditions.push(
      eq(
        listings.signalSource,
        signalSource as "badge_publication" | "badge_designer" | "text_match" | "manual"
      )
    );
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(listings)
      .where(where)
      .orderBy(desc(listings.confidence), desc(listings.rating))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(listings).where(where),
  ]);

  return {
    listings: rows,
    total: Number(countRows[0]?.count ?? 0),
  };
}

export async function getListingById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getListingByAirbnbId(airbnbId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(listings)
    .where(eq(listings.airbnbId, airbnbId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertListing(data: InsertListing): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getListingByAirbnbId(data.airbnbId);
  if (existing) {
    await db
      .update(listings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(listings.airbnbId, data.airbnbId));
    return existing.id;
  }

  const result = await db.insert(listings).values(data);
  return Number((result as unknown as { insertId: number }).insertId);
}

export async function getAvailableFilters() {
  const db = await getDb();
  if (!db) return { publications: [], designers: [], categories: [], regions: [] };

  const rows = await db
    .select({
      publications: listings.publications,
      designers: listings.designers,
      categories: listings.categories,
      region: listings.region,
    })
    .from(listings)
    .where(eq(listings.active, "yes"));

  const publicationSet = new Set<string>();
  const designerSet = new Set<string>();
  const categorySet = new Set<string>();
  const regionSet = new Set<string>();

  for (const row of rows) {
    if (row.publications) {
      row.publications.split(",").forEach((p) => publicationSet.add(p.trim()));
    }
    if (row.designers) {
      row.designers.split(",").forEach((d) => designerSet.add(d.trim()));
    }
    if (row.categories) {
      // Handle both JSON array format ["a-frame"] and legacy comma-separated format
      let cats: string[] = [];
      const trimmed = row.categories.trim();
      if (trimmed.startsWith('[')) {
        try {
          cats = JSON.parse(trimmed);
        } catch {
          cats = trimmed.replace(/[\[\]"]/g, '').split(',').map((c: string) => c.trim());
        }
      } else {
        cats = trimmed.split(',').map((c: string) => c.trim());
      }
      cats.forEach((c: string) => { if (c) categorySet.add(c); });
    }
    if (row.region) {
      regionSet.add(row.region);
    }
  }

  return {
    publications: Array.from(publicationSet).filter(Boolean).sort(),
    designers: Array.from(designerSet).filter(Boolean).sort(),
    categories: Array.from(categorySet).filter(Boolean).sort(),
    regions: Array.from(regionSet).filter(Boolean).sort(),
  };
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export async function insertBadges(listingId: number, badgeList: InsertBadge[]) {
  const db = await getDb();
  if (!db || badgeList.length === 0) return;

  // Remove existing badges for this listing before re-inserting
  await db.delete(badges).where(eq(badges.listingId, listingId));
  await db.insert(badges).values(badgeList.map((b) => ({ ...b, listingId })));
}

export async function getBadgesForListing(listingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(badges).where(eq(badges.listingId, listingId));
}

// ---------------------------------------------------------------------------
// Click tracking
// ---------------------------------------------------------------------------

export async function recordClick(
  listingId: number,
  activeFilter: string | null,
  sessionId: string | null
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(clickEvents).values({
    listingId,
    activeFilter: activeFilter ?? undefined,
    sessionId: sessionId ?? undefined,
  });
}

export async function getClickStats() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      listingId: clickEvents.listingId,
      clicks: sql<number>`count(*)`,
    })
    .from(clickEvents)
    .groupBy(clickEvents.listingId)
    .orderBy(desc(sql`count(*)`))
    .limit(50);
}

// ---------------------------------------------------------------------------
// Survey responses
// ---------------------------------------------------------------------------

export async function recordSurveyResponse(
  answer: "yes" | "no",
  followup: string | null,
  sessionId: string | null,
  activeCategory: string | null,
  activeState: string | null
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(surveyResponses).values({
    answer,
    followup: followup ?? undefined,
    sessionId: sessionId ?? undefined,
    activeCategory: activeCategory ?? undefined,
    activeState: activeState ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// Filter requests — demand capture from "Missing your filter?" CTA
// ---------------------------------------------------------------------------
export async function recordFilterRequest(
  whatLookingFor: string,
  email: string | null,
  sessionId: string | null
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(filterRequests).values({
    whatLookingFor,
    email: email ?? undefined,
    sessionId: sessionId ?? undefined,
  });
}

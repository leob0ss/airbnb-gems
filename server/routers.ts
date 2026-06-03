import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getAvailableFilters,
  getClickStats,
  getListingById,
  getListings,
  insertBadges,
  recordClick,
  recordFilterRequest,
  recordSurveyResponse,
  upsertListing,
} from "./db";
import { REGIONS, runGridScraper } from "./scraper/gridScraper";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(() => {
      return { success: true } as const;
    }),
  }),

  // -------------------------------------------------------------------------
  // Listings
  // -------------------------------------------------------------------------
  listings: router({
    /**
     * Get paginated listings with optional filters.
     */
    getAll: publicProcedure
      .input(
        z.object({
          publication: z.string().optional(),
          designer: z.string().optional(),
          category: z.string().optional(),
          region: z.string().optional(),
          signalSource: z.string().optional(),
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(500).default(24),
        })
      )
      .query(async ({ input }) => {
        return getListings(input);
      }),

    /**
     * Get a single listing by its internal ID.
     */
    getById: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const listing = await getListingById(input.id);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND" });
        return listing;
      }),

    /**
     * Get all available filter values (publications, designers, categories, regions).
     */
    getFilters: publicProcedure.query(async () => {
      return getAvailableFilters();
    }),

    /**
     * Record a click-through event when a user navigates to an Airbnb listing.
     */
    trackClick: publicProcedure
      .input(
        z.object({
          listingId: z.number().int(),
          activeFilter: z.string().nullable().optional(),
          sessionId: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await recordClick(
          input.listingId,
          input.activeFilter ?? null,
          input.sessionId ?? null
        );
        return { success: true };
      }),

    /**
     * Get click statistics (admin only).
     */
    getClickStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getClickStats();
    }),
  }),

  // -------------------------------------------------------------------------
  // Scraper (admin only)
  // -------------------------------------------------------------------------
  scraper: router({
    /**
     * Get available predefined regions.
     */
    getRegions: publicProcedure.query(() => {
      return Object.keys(REGIONS).map((key) => ({
        key,
        label: key
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        bounds: REGIONS[key],
      }));
    }),

    /**
     * Trigger a scrape run for a predefined region (admin only).
     * This is a fire-and-forget mutation — it starts the scraper in the background.
     */
    run: protectedProcedure
      .input(
        z.object({
          regionKey: z.string(),
          gridDivisions: z.number().int().min(2).max(10).default(4),
          maxPagesPerCell: z.number().int().min(1).max(15).default(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const region = REGIONS[input.regionKey];
        if (!region) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown region" });

        // Fire and forget — run in background
        setImmediate(async () => {
          try {
            await runGridScraper({
              region,
              gridDivisions: input.gridDivisions,
              maxPagesPerCell: input.maxPagesPerCell,
              onProgress: (msg) => console.log("[Scraper]", msg),
              onListingProcessed: async (processed) => {
                try {
                  const listingId = await upsertListing({
                    airbnbId: processed.airbnbId,
                    title: processed.title,
                    imageUrl: processed.imageUrl ?? undefined,
                    airbnbUrl: processed.airbnbUrl,
                    rating: processed.rating ?? undefined,
                    reviewCount: processed.reviewCount ?? undefined,
                    pricePerNight: processed.pricePerNight ?? undefined,
                    city: processed.city ?? undefined,
                    region: input.regionKey,
                    latitude: processed.latitude ? String(processed.latitude) : undefined,
                    longitude: processed.longitude ? String(processed.longitude) : undefined,
                    description: processed.description,
                    publications: processed.publications.join(","),
                    designers: processed.designers.join(","),
                    categories: processed.categories.join(","),
                    signalSource: processed.signalSource,
                    confidence: processed.confidence,
                    active: "yes",
                  });

                  // Insert individual badge records
                  // (imported inline to avoid circular dep)
                  const { extractListingData } = await import("./scraper/badgeExtractor");
                  // badges were already extracted; just map them
                  const badgeInserts = [
                    ...processed.publications.map((pub) => ({
                      listingId,
                      badgeType: "LISTING_DESIGN_PUBLICATIONS" as const,
                      label: `Featured in ${pub}`,
                      value: pub,
                    })),
                    ...processed.designers.map((d) => ({
                      listingId,
                      badgeType: "LISTING_NOTABLE_DESIGNER" as const,
                      label: `Designed by ${d}`,
                      value: d,
                    })),
                  ];

                  await insertBadges(listingId, badgeInserts);
                } catch (err) {
                  console.error("[Scraper] Failed to persist listing:", err);
                }
              },
            });
          } catch (err) {
            console.error("[Scraper] Run failed:", err);
          }
        });

        return {
          success: true,
          message: `Scraper started for region "${input.regionKey}". Check server logs for progress.`,
        };
      }),
  }),

  // -------------------------------------------------------------------------
  // PMF Survey
  // -------------------------------------------------------------------------
  surveys: router({
    /**
     * Submit a PMF survey response. Saves to DB and notifies the owner.
     */
    submit: publicProcedure
      .input(
        z.object({
          answer: z.enum(["yes", "no"]),
          followup: z.string().max(500).nullable().optional(),
          sessionId: z.string().nullable().optional(),
          activeCategory: z.string().nullable().optional(),
          activeState: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Persist to DB
        await recordSurveyResponse(
          input.answer,
          input.followup ?? null,
          input.sessionId ?? null,
          input.activeCategory ?? null,
          input.activeState ?? null
        );

        // Notify owner via push notification
        const { notifyOwner } = await import("./_core/notification");
        const answerLabel = input.answer === "yes" ? "✅ Yes" : "❌ Not yet";
        const followupLine = input.followup
          ? `\n\nFollow-up: "${input.followup}"`
          : "";
        const contextLine = [
          input.activeCategory && `Category: ${input.activeCategory}`,
          input.activeState && `State: ${input.activeState}`,
        ]
          .filter(Boolean)
          .join(" · ");

        await notifyOwner({
          title: `PMF Survey: ${answerLabel}`,
          content: `Answer: ${answerLabel}${followupLine}${contextLine ? `\n\nContext: ${contextLine}` : ""}`,
        });

        return { success: true };
      }),
  }),

  // -------------------------------------------------------------------------
  // Filter requests — demand capture from "Missing your filter?" CTA
  // -------------------------------------------------------------------------
  filterRequests: router({
    /**
     * Submit a filter request. Saves to DB and notifies the owner.
     */
    submit: publicProcedure
      .input(
        z.object({
          whatLookingFor: z.string().min(1).max(1000),
          email: z.string().email().nullable().optional(),
          sessionId: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await recordFilterRequest(
          input.whatLookingFor,
          input.email ?? null,
          input.sessionId ?? null
        );

        const { notifyOwner } = await import("./_core/notification");
        const emailLine = input.email ? `\n\nEmail: ${input.email}` : "";
        await notifyOwner({
          title: `Filter Request: "${input.whatLookingFor.slice(0, 60)}"`,
          content: `Looking for: "${input.whatLookingFor}"${emailLine}`,
        });

        return { success: true };
      }),
  }),

  // -------------------------------------------------------------------------
  // Contact — user-initiated message to the owner
  // -------------------------------------------------------------------------
  contact: router({
    submit: publicProcedure
      .input(
        z.object({
          message: z.string().min(1).max(2000),
          email: z.string().email().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { notifyOwner } = await import("./_core/notification");
        const emailLine = input.email ? `\n\nFrom: ${input.email}` : "";
        await notifyOwner({
          title: `Contact: new message`,
          content: `${input.message}${emailLine}`,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

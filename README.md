# Airbnb Gems

In 2025, Airbnb quietly hid unique categories from its app. This tool brings them back.

- **`/`** — Three ways to find a stay. **Categories** (default) opens Airbnb with hidden filters; **Describe** and **Handpicked** are on a waitlist.
- **`/v1`** — Original curated US catalog (treehouses + A-frames)

We don't host bookings; searches and listing cards open official Airbnb pages.

## Homepage

The default **Categories** tab is a curated tile grid. Pick one or more, add a place and dates if you want, and we open the matching Airbnb search.

Current tiles:

| Kind | Tiles |
| ---- | ----- |
| Property types | Cabin, Villa, Treehouse, Castle, Cave, Dome, Hut, Earth home, Tiny Homes, Boat (includes Houseboat), Island, Farm stay |
| Airbnb tags | Beachfront, Tower, A-frame, OMG!, Design |

**Describe** accepts a free-text stay request. **Handpicked** shows a small curated set of unusual listings. Search and Show more on those tabs collect email interest through the same `/api/filter-request` path as “Missing a feature?” — owner mail is titled `Feature waitlist: <feature>` so you can tell which one they asked for.

Last search inputs are still remembered in `localStorage` and prefilled on the next Categories run. The previous-searches list is gone.

## Stack

| Layer     | Tech                                             |
| --------- | ------------------------------------------------ |
| Frontend  | React 19, Vite, Tailwind CSS 4, shadcn/ui        |
| Listings  | Static JSON (`client/public/listings.json`)      |
| Forms API | Vercel serverless → Neon Postgres + Resend email |
| Analytics | PostHog (client `track` / `identify`, server capture on form save) |
| Deploy    | Vercel                                           |

## Quick start (local)

```bash
pnpm install
cp .env.example .env   # add POSTGRES_URL for forms, optional maps key
pnpm data:json         # CSV → listings.json (already committed; re-run after CSV updates)
pnpm dev
# → http://localhost:3000
```

## Deploy to Vercel

1. Push to GitHub — Vercel redeploys automatically.
2. **Storage → Neon** (sets `POSTGRES_URL`).
3. **Resend** env vars: `NOTIFY_EMAIL`, `RESEND_API_KEY`, optional `RESEND_FROM`.
4. Optional: `VITE_GOOGLE_MAPS_API_KEY` for the desktop map view.
5. Optional: `VITE_POSTHOG_PROJECT_TOKEN` (+ `VITE_POSTHOG_HOST`) for product analytics. The same token is reused by `/api/filter-request` for server-side capture (`POSTHOG_PROJECT_API_KEY` / `POSTHOG_HOST` override if you want a separate server key). Visitors are identified by the same `visitor_id` stored in the browser, so Person → Activity in PostHog shows their event stream. Email is attached via `identify`, not as a regular event property.

## Analytics events

Autocapture is off. Pageviews are on. Custom events for the homepage:

| Event | When |
| ----- | ---- |
| `find_mode_changed` | Categories / Describe / Handpicked tab switch (`from`, `to`) |
| `category_toggled` | A category tile is selected or cleared |
| `category_continue` | Continue from the category grid |
| `airbnb_search_opened` | Categories search opens Airbnb |
| `describe_search_submitted` | Describe Search (opens the waitlist dialog) |
| `handpicked_listing_opened` | A handpicked card is opened |
| `handpicked_show_more_clicked` | Show more on Handpicked |
| `missing_feature_clicked` | “Missing a feature?” (`source`, `find_mode`) |
| `feature_waitlist_shown` / `_dismissed` / `_failed` | Waitlist dialog lifecycle |
| `feature_waitlist` | Client-side waitlist signup |
| `filter_requested` | Missing-feature / filter dialog submit |
| `feature_waitlist_saved` / `filter_request_saved` | Server confirmation after Neon write |

## Updating listings

1. Edit `data/listings-export.csv` (or replace it with a new export).
2. Regenerate JSON and deploy:

   ```bash
   pnpm data:json
   git add data/listings-export.csv client/public/listings.json
   git commit -m "Update listings"
   git push
   ```

## Scripts

| Command          | Description                                 |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Local dev (Vite + form API routes)          |
| `pnpm data:json` | Convert CSV → `client/public/listings.json` |
| `pnpm build`     | Regenerate JSON + build for Vercel          |
| `pnpm test`      | Run Vitest tests                            |

## Project structure

```
├── client/public/listings.json   # Listing data served to the browser
├── client/src/components/FindModes.tsx
├── client/src/lib/handpicked.ts  # Curated Handpicked stays
├── client/src/lib/vibes.ts       # Category tiles + Airbnb filter IDs
├── data/listings-export.csv      # Source of truth for /v1 listings
├── scripts/csv-to-json.mjs       # CSV → JSON converter
├── api/                          # Vercel serverless handlers
├── server/contact|filterRequest|survey/  # Form logic (Neon + Resend)
├── server/_core/posthog.ts       # Server-side event capture
└── client/src/                   # React frontend
```

## Disclaimer

Airbnb Gems is not affiliated with or endorsed by Airbnb, Inc. All listings link to official Airbnb pages.
